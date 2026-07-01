import type { ModelTier } from '../types';

/** Task-facing capabilities — orthogonal to difficulty tier. */
export type ModelCapability =
  | 'chat'
  | 'reasoning'
  | 'vision'
  | 'code'
  | 'long-context'
  | 'embedding';

export type PrivacyMode = 'private' | 'anonymized';

/** A node in the provider model catalog (Venice, OpenRouter, etc.). */
export interface ModelCatalogNode {
  id: string;
  label: string;
  tier: ModelTier;
  capabilities: ModelCapability[];
  contextWindow: number;
  costPer1MInput: number;
  costPer1MOutput: number;
  privacy?: PrivacyMode;
  /** Canonical model for difficulty tier when no capability hints. */
  tierAnchor?: boolean;
  /** Specialty branch (vision, code, …) — not used as plain tier default. */
  specialty?: ModelCapability;
}

/** Directed edge: upgrade path, downgrade, or specialty branch. */
export interface ModelCatalogEdge {
  from: string;
  to: string;
  kind: 'upgrade' | 'downgrade' | 'specialize';
  /** Human-readable trigger, e.g. "needs vision" or "chamber hard". */
  when: string;
}

export interface ModelCatalog {
  provider: string;
  baseUrl: string;
  nodes: ModelCatalogNode[];
  edges: ModelCatalogEdge[];
}

export interface ResolveModelInput {
  tier: ModelTier;
  capabilities?: ModelCapability[];
  privacy?: PrivacyMode;
  /** Prefer lowest cost among ties. Default true. */
  preferCheaper?: boolean;
}
