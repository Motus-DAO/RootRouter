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

// Model catalogs (provider graphs: tier + capability → model id)
export {
  VENICE_CATALOG,
  VENICE_TIER_DEFAULTS,
  resolveVeniceModel,
  followVeniceEdge,
  OPENROUTER_CATALOG,
  OPENROUTER_TIER_DEFAULTS,
  resolveOpenRouterModel,
  followOpenRouterEdge,
  resolveFromCatalog,
  followCatalogEdge,
  getCatalogById,
  getTierDefaults,
  inferCatalogFromBaseUrl,
  resolveActiveCatalogId,
  resolveModelForRouting,
  detectCapabilities,
  lastUserMessageText,
  estimateMessagesTokens,
} from './models';
export type {
  ModelCapability,
  PrivacyMode,
  ModelCatalogNode,
  ModelCatalogEdge,
  ModelCatalog,
  ResolveModelInput,
  ModelCatalogId,
  ResolveModelForRoutingInput,
  RoutableMessage,
} from './models';
export type { ModelCatalogMode, ModelTierOverrides } from './types';

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
export {
  appendSelectionAudit,
  listSelectionAudit,
  summarizeSelectionAudit,
  setSelectionAuditPath,
  getSelectionAuditPath,
} from './logs/selectionAudit';
export type { SelectionAuditEntry, SelectionAuditSummary, ListSelectionAuditOptions } from './logs/selectionAudit';

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
  buildSelectionSnapshot,
  attachSelectionSnapshot,
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
  SelectionSnapshot,
  SelectionStats,
  RepoGraphSnapshot,
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

// Spec-native selection helpers
export {
  buildQueryFromSpec,
  buildSelectionFromSpec,
  extractAcceptanceCriteria,
  extractAnchorPaths,
  extractSpecTitle,
  inferPathPrefix,
  loadSpecText,
  parseSpec,
  pathMentionedInSpec,
  resolveActiveSpecPath,
} from './spec';
export type { ParsedSpec, SpecSelectionHints } from './spec';
