import { selectContext, estimateTokens, type ContextItem } from 'rootrouter';

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
}

export interface FilterOutcome {
  messages: ChatMessage[];
  filtered: boolean;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  keptCandidates: number;
  totalCandidates: number;
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

/**
 * Decide whether a message is a "candidate" for trimming.
 *
 * Conservative on purpose: only plain-text user/assistant turns are candidates.
 * System messages, tool/function messages, and any non-string (multimodal) content
 * are always kept, so we never drop instructions or structured payloads.
 */
function isCandidate(m: ChatMessage, index: number, lastUserIndex: number): boolean {
  if (index === lastUserIndex) return false; // the current query — always keep
  if (m.role !== 'user' && m.role !== 'assistant') return false;
  if (typeof m.content !== 'string') return false;
  return true;
}

/**
 * Trim a chat-completions message array down to its relevant core.
 *
 * Keeps all system messages, tool/function messages, multimodal messages, and the
 * final user message. Among the remaining prior user/assistant turns, selects the
 * subset most relevant to the final user message (cosine similarity + MMR) that fits
 * `contextBudget`, then re-emits everything in original order so the conversation
 * stays coherent.
 *
 * Fails open: any error returns the original messages unchanged (handled by caller).
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
  if (tokensBefore < options.minTokensToFilter) return noop;

  // Find the last user message — that's the query we select context for.
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIndex = i;
      break;
    }
  }
  if (lastUserIndex === -1) return noop; // nothing to anchor relevance to

  const query = messageText(messages[lastUserIndex].content);
  if (!query.trim()) return noop;

  // Build candidate items from prior plain-text turns.
  const candidateIndices: number[] = [];
  const items: ContextItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (isCandidate(messages[i], i, lastUserIndex)) {
      candidateIndices.push(i);
      items.push({
        id: String(i),
        text: messageText(messages[i].content),
        kind: 'message',
        // Earlier messages get earlier timestamps so recency is meaningful if enabled.
        timestamp: i,
      });
    }
  }

  if (items.length === 0) return noop;

  const result = await selectContext({
    query,
    items,
    tokenBudget: options.contextBudget,
    options: { mmrLambda: options.mmrLambda ?? 0.7, baseline: 'all' },
  });

  const keptIds = new Set(result.selected.map((i) => i.id));

  // Re-emit in original order: keep non-candidates always, candidates only if selected.
  const candidateSet = new Set(candidateIndices);
  const out: ChatMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (candidateSet.has(i)) {
      if (keptIds.has(String(i))) out.push(messages[i]);
    } else {
      out.push(messages[i]);
    }
  }

  const tokensAfter = tokensOf(out);
  const tokensSaved = Math.max(0, tokensBefore - tokensAfter);

  return {
    messages: out,
    filtered: tokensSaved > 0,
    tokensBefore,
    tokensAfter,
    tokensSaved,
    keptCandidates: keptIds.size,
    totalCandidates: items.length,
  };
}
