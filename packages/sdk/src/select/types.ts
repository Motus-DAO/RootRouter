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
  /** Last time this item was selected (ms epoch); used for LRU eviction. */
  lastSelectedAt?: number;
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
   * Weight added for RepoGraph neighbors (1-hop via metadata.edges). Default 0.12 when
   * repo nodes are present; set to 0 to disable.
   */
  graphBoost?: number;
  /** Top-k relevance seeds for graph expansion. Default 3. */
  graphSeedK?: number;
  /** Extra boost for high-degree (hub) repo nodes, scaled by degree/maxDegree. Default 0.05. */
  hubBoost?: number;
  /** Max items selected per metadata.community (directory). Default 2; 0 disables. */
  maxPerCommunity?: number;
  /**
   * Baseline for tokensSaved: 'all' compares against sending every candidate;
   * 'window' compares against a recency window of windowSize items. Default 'all'.
   */
  baseline?: SelectionBaseline;
  /** Window size for the 'window' baseline. Default 20. */
  windowSize?: number;
  /** Restrict candidates to this agent's items when selecting from a store. */
  agentId?: string;
  /**
   * Keep only file chunks whose metadata.path is under one of these prefixes
   * (repo-relative). Items without metadata.path (messages, tool output) are kept.
   */
  pathPrefix?: string | string[];
  /**
   * Drop file chunks whose metadata.path is under any of these prefixes.
   * Applied before pathPrefix.
   */
  excludePaths?: string | string[];
  /**
   * Repo-relative paths from the active spec; matching file chunks get a relevance boost.
   * Set automatically by select_for_spec.
   */
  specPaths?: string[];
  /** Boost added when metadata.path matches specPaths. Default 0.12 when specPaths set. */
  specBoost?: number;
  /**
   * When candidate count exceeds this threshold, use HNSW ANN prefilter before MMR.
   * Default 500; set 0 to disable.
   */
  annThreshold?: number;
  /** Top-k candidates to retrieve via ANN prefilter. Default 200. */
  annPrefetchK?: number;
}

/** Per-item score breakdown for transparency/debugging. */
export interface ItemScore {
  id: string;
  relevance: number;
  recency: number;
  chamber: number;
  graph: number;
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
    graphBoosted: number;
    /** Candidates before ANN prefilter (when applied). */
    annPrefilteredFrom?: number;
    /** Candidates removed by pathPrefix / excludePaths before scoring. */
    pathFiltered?: number;
    /** Candidates boosted because path appears in active spec. */
    specBoosted?: number;
  };
  /** Item ids not selected (for recall metrics). */
  droppedIds?: string[];
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
