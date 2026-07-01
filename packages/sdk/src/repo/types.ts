import type { ContextItem } from '../select/types';

/** Supported source languages for MVP import parsing. */
export type RepoLanguage = 'typescript' | 'javascript' | 'python' | 'markdown' | 'other';

/** Edge types in the RepoGraph. */
export type RepoEdgeType = 'imports' | 'same_directory';

export interface RepoEdge {
  targetId: string;
  type: RepoEdgeType;
}

export interface IndexRepoOptions {
  /** Repository root (resolved and jailed). */
  rootPath: string;
  /** Max bytes per file (default 256_000). */
  maxFileBytes?: number;
  /** Max tokens per chunk (default 400). */
  maxChunkTokens?: number;
  /** Glob-like extensions to include (default common code extensions). */
  extensions?: string[];
  /** Optional agent id stamped on all indexed items. */
  agentId?: string;
  /** Additional directory names to skip (merged with defaults). */
  ignoreDirs?: string[];
}

export interface IndexRepoStats {
  filesScanned: number;
  chunksIndexed: number;
  edgesCreated: number;
  communities: number;
  maxDegree: number;
  rootPath: string;
  durationMs: number;
}

export interface IndexRepoResult {
  items: ContextItem[];
  stats: IndexRepoStats;
}

/** Metadata shape stored on repo ContextItems. */
export interface RepoNodeMetadata {
  nodeType: 'file_chunk';
  /** Absolute resolved repo root used when indexing (namespace for chunk ids). */
  repoRoot?: string;
  path: string;
  language: RepoLanguage;
  startLine: number;
  endLine: number;
  /** Neighbor node ids (import targets + same-directory peers). */
  edges: string[];
  /** Directory-based community id. */
  community: string;
  /** Structural degree (edge count) for hub boosting. */
  degree: number;
  imports: string[];
}
