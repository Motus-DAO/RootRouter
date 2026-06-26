import { Vector } from '../types';

/**
 * Selection engine types.
 *
 * The selection engine is the provider-agnostic core of RootRouter v2. It takes a
 * query plus a pool of candidate context items and returns the minimal relevant slice
 * that fits a token budget — without ever owning the LLM call. This is what lets
 * external agent runtimes (Codex, Cursor, OpenClaw, Hermes) cut prompt tokens.
 */

/** The kind of context an item represents. Free-form callers may extend via metadata. */
export type ContextItemKind = 'message' | 'file' | 'tool_result' | 'doc';

/**
 * A single unit of candidate context. The unit of retrieval — generic enough to hold
 * prior chat turns, file chunks, tool outputs, or documents.
 */
export interface ContextItem {
  /** Stable identifier; used for dedup/upsert. */
  id: string;
  /** Raw text content that would be injected into a prompt. */
  text: string;
  /** Optional classification of the item. */
  kind?: ContextItemKind;
  /** Optional owning agent, used to scope retrieval per agent. */
  agentId?: string;
  /** Arbitrary caller metadata (file path, line range, source, etc.). */
  metadata?: Record<string, unknown>;
  /** Optional precomputed embedding. If absent, the engine embeds the text. */
  vector?: Vector;
  /** Optional precomputed token count. If absent, estimated from text. */
  tokens?: number;
  /** Optional creation/observation time (ms epoch); enables recency boost/eviction. */
  timestamp?: number;
}

/** Baseline used to compute tokensSaved. */
export type SelectionBaseline = 'all' | 'window';

/** Knobs controlling a single selection. */
export interface SelectionOptions {
  /** Hard cap on total tokens of the selected items. */
  tokenBudget: number;
  /**
   * MMR trade-off in [0,1]. Higher favors relevance to the query; lower favors
   * diversity (less redundancy among selected items). Default 0.7.
   */
  mmrLambda?: number;
  /**
   * Weight added for recent items (0 disables). Recency is normalized across the
   * candidate pool. Default 0.
   */
  recencyBoost?: number;
  /**
   * Weight added when a candidate falls in the same/adjacent chamber as the query.
   * Only applies when a fitted vector space is supplied to the selector. Default 0.15.
   */
  chamberBoost?: number;
  /**
   * Baseline for tokensSaved: 'all' compares against sending every candidate;
   * 'window' compares against a recency window of windowSize items. Default 'all'.
   */
  baseline?: SelectionBaseline;
  /** Window size for the 'window' baseline. Default 20. */
  windowSize?: number;
  /** Restrict candidates to this agent's items when selecting from a store. */
  agentId?: string;
}

/** Per-item score breakdown for transparency/debugging. */
export interface ItemScore {
  id: string;
  relevance: number;
  recency: number;
  chamber: number;
  /** Final MMR-adjusted score at the moment the item was selected (or considered). */
  combined: number;
  selected: boolean;
}

/** Result of a selection. */
export interface SelectionResult {
  /** Selected items, in selection order (most valuable first). */
  selected: ContextItem[];
  /** Per-item scores keyed by item id. */
  scores: Record<string, ItemScore>;
  /** Total tokens across the candidate pool (or baseline window). */
  tokensIn: number;
  /** Total tokens across the selected items. */
  tokensOut: number;
  /** tokensIn (baseline) - tokensOut, floored at 0. */
  tokensSaved: number;
  /** Percentage of baseline tokens saved. */
  percentSaved: number;
  /** Human-readable explanation of the selection. */
  reasoning: string;
  /** Counts by signal that contributed to the selection. */
  breakdown: {
    candidates: number;
    selected: number;
    droppedByBudget: number;
    chamberBoosted: number;
  };
}

/**
 * Pluggable embedding provider. The default is zero-dependency TF-IDF; real models
 * (API or local ONNX) are opt-in by implementing this interface.
 */
export interface EmbeddingProvider {
  /** Dimensionality of produced vectors. */
  readonly dimension: number;
  /** Embed a single text into a vector. */
  embed(text: string): Promise<Vector>;
  /** Embed multiple texts; order-preserving. */
  embedBatch(texts: string[]): Promise<Vector[]>;
  /**
   * Optional corpus fit (e.g. TF-IDF IDF statistics). Providers that need no fit
   * may omit this.
   */
  fit?(corpus: string[]): void;
}

/**
 * Pluggable store of context items. The default is in-memory; a file-backed store
 * persists across process invocations (needed for the MCP server).
 */
export interface ContextStore {
  /** Insert or replace items by id. */
  upsert(items: ContextItem[]): void;
  /** Fetch a single item by id. */
  get(id: string): ContextItem | undefined;
  /** Return all items, optionally scoped to an agent. */
  all(agentId?: string): ContextItem[];
  /** Number of stored items. */
  readonly size: number;
  /** Optional durable load. */
  load?(): void | Promise<void>;
  /** Optional durable save. */
  save?(): void | Promise<void>;
}
