// RootRouter — Algebraic Agent Infrastructure
// Public API exports

export { RootRouter } from './rootRouter';
export { loadConfig, defaultConfig, validateBoot, SAFE_MODE_MAX_CONTEXT_TOKENS } from './config';

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
  BootValidationResult,
  RetrieveContextInput,
  RetrieveContextOutput,
  RouteModelInput,
  RouteModelOutput,
  BuildPromptInput,
  BuildPromptOutput,
  ExecuteLLMInput,
  ExecuteLLMOutput,
  RecordTelemetryInput,
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

// Pipeline (modular chat stages)
export {
  retrieveContext,
  routeModel,
  buildPrompt,
  executeLLM,
  recordTelemetry,
} from './pipeline';
export type { ChatPipelineDeps, ITelemetrySink } from './pipeline';
export type { LLMCaller } from './pipeline';

// Logs
export {
  appendRouterMetrics,
  appendRouterMetricsError,
  buildRouterMetricsEntry,
  setRouterMetricsPath,
  getRouterMetricsPath,
} from './logs/routerMetrics';
export type { RouterMetricsEntry, RouterMetricsErrorEntry } from './logs/routerMetrics';
export { LocalTelemetryFallback, setLocalTelemetryPath, getLocalTelemetryPath } from './logs/localTelemetry';

// Celo
export { CeloTelemetry } from './celo/telemetry';
export { ERC8004Registration } from './celo/erc8004';

// Context selection engine (provider-agnostic, LLM-free)
export {
  selectContext,
  ContextSelector,
  ContextEngine,
  TfIdfEmbeddingProvider,
  ApiEmbeddingProvider,
  CachedEmbeddingProvider,
  LocalOnnxEmbeddingProvider,
  buildEmbeddingProviderFromEnv,
  InMemoryContextStore,
  FileContextStore,
} from './select';
export type {
  ContextItem,
  ContextItemKind,
  ContextStore,
  EmbeddingProvider,
  ItemScore,
  SelectionBaseline,
  SelectionOptions,
  SelectionResult,
  ContextEngineOptions,
  ApiEmbeddingConfig,
  CachedEmbeddingOptions,
  LocalEmbeddingModel,
  BuildProviderOptions,
  InMemoryStoreOptions,
  FileStoreOptions,
} from './select';

// RepoGraph — native repository indexer
export { indexRepo, walkRepo, chunkFileContent, extractImports, detectLanguage } from './repo';
export type {
  IndexRepoOptions,
  IndexRepoResult,
  IndexRepoStats,
  RepoNodeMetadata,
  RepoLanguage,
} from './repo';
