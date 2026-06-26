import { selectContext, estimateTokens, type ContextEngine, type ContextItem } from 'rootrouter';
import {
  messagesToRequestCandidates,
  messagesToStoreItems,
  storeItemsExcludingRequest,
} from './messageStore.js';

/** A single OpenAI-style chat message (content may be a string or multimodal array). */
export interface ChatMessage {
  role: string;
  content: unknown;
  name?: string;
  [key: string]: unknown;
}

export interface FilterOptions {
  /** Token budget for the selectable "middle" context (prior turns). */
  contextBudget: number;
  /**
   * Only filter when the full message payload exceeds this many tokens. Below it,
   * the request passes through untouched (small prompts aren't worth trimming).
   */
  minTokensToFilter: number;
  /** Relevance vs diversity trade-off for MMR (default 0.7). */
  mmrLambda?: number;
  /** When set, enables cross-session store recall and persistence. */
  engine?: ContextEngine;
  /** Scope store recall to this agent (default `default`). */
  agentId?: string;
  /** Fraction of contextBudget for store hits when engine is set (default 0.5). */
  storeShare?: number;
  /** Savings baseline: 'window' compares last N turns; 'all' uses full candidate pool. */
  baseline?: 'all' | 'window';
  /** Window size when baseline is 'window'. Default 20. */
  baselineWindowSize?: number;
  /** When `'down'`, invoke onRecallFeedback for dropped turns (thumbs-down hook). */
  recallFeedback?: 'down';
  /** Callback invoked when recallFeedback is `'down'`. */
  onRecallFeedback?: RecallFeedbackHandler;
}

export interface RecallFeedbackPayload {
  agentId: string;
  query: string;
  droppedMessageIndices: number[];
  droppedStoreIds: string[];
  feedback: 'down';
}

export type RecallFeedbackHandler = (payload: RecallFeedbackPayload) => void;

export interface FilterOutcome {
  messages: ChatMessage[];
  filtered: boolean;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  keptCandidates: number;
  totalCandidates: number;
  /** Selected items recalled from the persistent store (stateful mode only). */
  storeRecalled?: number;
  /** In-request message indices dropped by trimming. */
  droppedMessageIndices?: number[];
  /** Store item ids considered but not injected. */
  droppedStoreIds?: string[];
}

/** Extract plain text from a message's content (string or array of text parts). */
export function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          const t = (part as { text?: unknown }).text;
          return typeof t === 'string' ? t : '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function tokensOf(messages: ChatMessage[]): number {
  let sum = 0;
  for (const m of messages) sum += estimateTokens(messageText(m.content));
  return sum;
}

function isCandidate(m: ChatMessage, index: number, lastUserIndex: number): boolean {
  if (index === lastUserIndex) return false;
  if (m.role !== 'user' && m.role !== 'assistant') return false;
  if (typeof m.content !== 'string') return false;
  return true;
}

function findLastUserIndex(messages: ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return i;
  }
  return -1;
}

/**
 * Trim a chat-completions message array down to its relevant core.
 *
 * Stateless (no `engine`): selects among in-request prior turns only.
 *
 * Stateful (`engine` set): upserts turns into the file-backed store, merges store
 * candidates with in-request history, selects within a split budget, and injects
 * recalled store turns into the prompt before the final user message.
 */
export async function filterMessages(
  messages: ChatMessage[],
  options: FilterOptions
): Promise<FilterOutcome> {
  const tokensBefore = tokensOf(messages);
  const noop: FilterOutcome = {
    messages,
    filtered: false,
    tokensBefore,
    tokensAfter: tokensBefore,
    tokensSaved: 0,
    keptCandidates: 0,
    totalCandidates: 0,
  };

  if (!Array.isArray(messages) || messages.length === 0) return noop;

  const lastUserIndex = findLastUserIndex(messages);
  if (lastUserIndex === -1) return noop;

  const query = messageText(messages[lastUserIndex].content);
  if (!query.trim()) return noop;

  if (options.engine) {
    return filterStateful(messages, options, tokensBefore, lastUserIndex, query);
  }

  if (tokensBefore < options.minTokensToFilter) return noop;
  return filterStateless(messages, options, tokensBefore, lastUserIndex, query);
}

async function filterStateless(
  messages: ChatMessage[],
  options: FilterOptions,
  tokensBefore: number,
  lastUserIndex: number,
  query: string
): Promise<FilterOutcome> {
  const noop: FilterOutcome = {
    messages,
    filtered: false,
    tokensBefore,
    tokensAfter: tokensBefore,
    tokensSaved: 0,
    keptCandidates: 0,
    totalCandidates: 0,
  };

  const requestItems = messagesToRequestCandidates(messages, lastUserIndex);
  if (requestItems.length === 0) return noop;

  const result = await selectContext({
    query,
    items: requestItems,
    tokenBudget: options.contextBudget,
    options: selectionOpts(options),
  });

  const droppedMessageIndices = computeDroppedMessageIndices(
    messages,
    lastUserIndex,
    result.selected
  );

  const out = assembleMessages(messages, lastUserIndex, result.selected, []);
  const tokensAfter = tokensOf(out);
  const tokensSaved = Math.max(0, tokensBefore - tokensAfter);

  return {
    messages: out,
    filtered: tokensSaved > 0,
    tokensBefore,
    tokensAfter,
    tokensSaved,
    keptCandidates: result.selected.length,
    totalCandidates: requestItems.length,
    droppedMessageIndices,
    droppedStoreIds: result.droppedIds,
  };
}

async function filterStateful(
  messages: ChatMessage[],
  options: FilterOptions,
  tokensBefore: number,
  lastUserIndex: number,
  query: string
): Promise<FilterOutcome> {
  const noop: FilterOutcome = {
    messages,
    filtered: false,
    tokensBefore,
    tokensAfter: tokensBefore,
    tokensSaved: 0,
    keptCandidates: 0,
    totalCandidates: 0,
    storeRecalled: 0,
  };

  const engine = options.engine!;
  const agentId = options.agentId ?? 'default';
  const storeShare = options.storeShare ?? 0.5;

  // Always persist turns from this request (even if we don't trim).
  engine.record(messagesToStoreItems(messages, agentId));

  const shouldTrim = tokensBefore >= options.minTokensToFilter;
  const requestItems = messagesToRequestCandidates(messages, lastUserIndex);
  const requestTexts = new Set(
    messages
      .filter((m) => typeof m.content === 'string')
      .map((m) => messageText(m.content))
  );
  const storeItems = storeItemsExcludingRequest(engine.getStore().all(agentId), requestTexts);

  // Short requests with no in-request history still recall from store (cross-session memory).
  const needsStoreRecall = requestItems.length === 0 && storeItems.length > 0;

  if (!shouldTrim && !needsStoreRecall) {
    await engine.save();
    return noop;
  }

  let storeBudget = Math.floor(options.contextBudget * storeShare);
  let requestBudget = Math.max(0, options.contextBudget - storeBudget);

  if (needsStoreRecall && !shouldTrim) {
    storeBudget = options.contextBudget;
    requestBudget = 0;
  }
  const mmrOpts = selectionOpts(options);

  const selectedRequest: ContextItem[] = [];
  const selectedStore: ContextItem[] = [];
  let droppedStoreIds: string[] = [];

  if (requestItems.length > 0 && requestBudget > 0) {
    const r = await selectContext({
      query,
      items: requestItems,
      tokenBudget: requestBudget,
      options: mmrOpts,
    });
    selectedRequest.push(...r.selected);
  }

  if (storeItems.length > 0 && storeBudget > 0) {
    const r = await selectContext({
      query,
      items: storeItems,
      tokenBudget: storeBudget,
      options: mmrOpts,
    });
    selectedStore.push(...r.selected);
    droppedStoreIds = r.droppedIds ?? [];
  }

  const droppedMessageIndices = computeDroppedMessageIndices(
    messages,
    lastUserIndex,
    selectedRequest
  );

  maybeRecallFeedback(options, agentId, query, droppedMessageIndices, droppedStoreIds);

  const out = assembleMessages(messages, lastUserIndex, selectedRequest, selectedStore);
  const tokensAfter = tokensOf(out);
  const tokensSaved = Math.max(0, tokensBefore - tokensAfter);

  await engine.save();

  return {
    messages: out,
    filtered: out.length !== messages.length || tokensSaved > 0,
    tokensBefore,
    tokensAfter,
    tokensSaved,
    keptCandidates: selectedRequest.length + selectedStore.length,
    totalCandidates: requestItems.length + storeItems.length,
    storeRecalled: selectedStore.length,
    droppedMessageIndices,
    droppedStoreIds,
  };
}

/** Rebuild the message list: protected prefix, selected middle, injected store, suffix from final user. */
function assembleMessages(
  messages: ChatMessage[],
  lastUserIndex: number,
  selectedRequest: ContextItem[],
  selectedStore: ContextItem[]
): ChatMessage[] {
  const keptReqIndices = new Set(
    selectedRequest
      .map((i) => i.metadata?.messageIndex)
      .filter((n): n is number => typeof n === 'number')
  );

  const out: ChatMessage[] = [];

  for (let i = 0; i < lastUserIndex; i++) {
    if (!isCandidate(messages[i], i, lastUserIndex)) {
      out.push(messages[i]);
    } else if (keptReqIndices.has(i)) {
      out.push(messages[i]);
    }
  }

  const storeSorted = [...selectedStore].sort(
    (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)
  );
  for (const item of storeSorted) {
    const role = (item.metadata?.role as string) ?? 'user';
    out.push({ role, content: item.text });
  }

  for (let i = lastUserIndex; i < messages.length; i++) {
    out.push(messages[i]);
  }

  return out;
}

function selectionOpts(options: FilterOptions) {
  return {
    mmrLambda: options.mmrLambda ?? 0.7,
    baseline: options.baseline ?? 'window',
    windowSize: options.baselineWindowSize ?? 20,
  };
}

function computeDroppedMessageIndices(
  messages: ChatMessage[],
  lastUserIndex: number,
  selected: ContextItem[]
): number[] {
  const kept = new Set(
    selected
      .map((i) => i.metadata?.messageIndex)
      .filter((n): n is number => typeof n === 'number')
  );
  const dropped: number[] = [];
  for (let i = 0; i < lastUserIndex; i++) {
    if (!isCandidate(messages[i], i, lastUserIndex)) continue;
    if (!kept.has(i)) dropped.push(i);
  }
  return dropped;
}

function maybeRecallFeedback(
  options: FilterOptions,
  agentId: string,
  query: string,
  droppedMessageIndices: number[],
  droppedStoreIds: string[]
): void {
  if (options.recallFeedback !== 'down' || !options.onRecallFeedback) return;
  if (droppedMessageIndices.length === 0 && droppedStoreIds.length === 0) return;
  options.onRecallFeedback({
    agentId,
    query,
    droppedMessageIndices,
    droppedStoreIds,
    feedback: 'down',
  });
}
