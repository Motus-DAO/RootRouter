// RootRouter — Algebraic Agent Infrastructure
// Public API exports

export { RootRouter } from './rootRouter';
export { loadConfig, defaultConfig } from './config';

// Types
export type {
  Vector,
  RootPair,
  RootDirection,
  Chamber,
  Reflection,
  InteractionEdgeType,
  InteractionNode,
  InteractionEdge,
  AgentNode,
  AgentEdge,
  GraphSpectrum,
  FilterResult,
  ModelTier,
  RoutingDecision,
  ModelConfig,
  RouterConfig,
  TelemetrySummary,
  TelemetryEntry,
} from './types';

// Math utilities
export {
  vectorAdd, vectorSubtract, vectorScale,
  dot, norm, normalize,
  cosineSimilarity, project, reflect,
  signPattern, vectorMean, covarianceMatrix,
  estimateTokens,
} from './math/vectors';
export { computePCA } from './math/pca';
export type { PCAResult } from './math/pca';
export { kmeans } from './math/kmeans';
export type { KMeansResult } from './math/kmeans';

// Embeddings
export { TfIdfVectorizer } from './embeddings/tfidf';
export { embed, embedBatch } from './embeddings/api';

// Core components
export { RootPairCollector } from './core/collector';
export { StructuredVectorSpace } from './core/vectorSpace';
export { InteractionGraph } from './core/graph';
export { AgentTopologyGraph } from './core/agentGraph';
export { ContextFilter } from './core/contextFilter';
export { ModelRouter } from './core/router';

// Celo
export { CeloTelemetry } from './celo/telemetry';
export { ERC8004Registration } from './celo/erc8004';
