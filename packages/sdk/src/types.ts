/**
 * RootRouter Type Definitions
 *
 * Core mathematical objects:
 * - RootPair: the fundamental measurement unit (intent vs execution gap)
 * - RootDirection: principal axis of variation in root vector space (analogous to simple root in Lie algebra)
 * - Chamber: region of vector space bounded by root direction hyperplanes (analogous to Weyl chamber)
 *
 * Graph objects:
 * - InteractionNode: a node in the interaction knowledge graph
 * - InteractionEdge: a weighted, typed edge between interactions
 * - AgentNode: a node in the agent topology graph
 * - AgentEdge: performance-weighted delegation relationship
 *
 * Infrastructure:
 * - RouterConfig: full configuration
 * - RoutingDecision: output of the routing engine
 * - TelemetrySummary: aggregate analytics
 */

// ════════════════════════════════════════════════════════════
// VECTOR SPACE TYPES
// ════════════════════════════════════════════════════════════

/** A vector in R^d */
export type Vector = number[];

/** A root pair from a single agent interaction */
export interface RootPair {
  id: string;
  timestamp: number;
  agentId: string;
  modelUsed: string;

  // Raw interaction data
  query: string;
  response: string;

  // Vectors in the behavioral data space
  intentVector: Vector;
  executionVector: Vector;
  rootVector: Vector;
  rootNorm: number;

  // Token economics
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;

  // Classification (set after chamber assignment)
  chamberId: number | null;

  // Graph position (set after graph insertion)
  graphNodeId: string | null;
}

/**
 * A root direction = principal axis of variation in the root vector space.
 * Analogous to a simple root in a Lie algebra root system.
 */
export interface RootDirection {
  index: number;
  direction: Vector;
  eigenvalue: number;
  varianceRatio: number;
}

/**
 * A chamber = region of root vector space defined by root directions.
 * The sign pattern of a vector's projections onto root directions determines its chamber.
 * This is the simplified Weyl chamber construction.
 */
export interface Chamber {
  id: number;
  signPattern: number[];
  centroid: Vector;
  avgRootNorm: number;
  interactionCount: number;
  bestModel: string;
  modelPerformance: Record<string, { avgNorm: number; count: number }>;
  adjacentChamberIds: number[];
}

/** The reflection of a vector through a root direction's hyperplane */
export interface Reflection {
  original: Vector;
  reflected: Vector;
  rootDirectionIndex: number;
  projectionMagnitude: number;
}

// ════════════════════════════════════════════════════════════
// GRAPH TYPES
// ════════════════════════════════════════════════════════════

/** Edge types in the interaction knowledge graph */
export type InteractionEdgeType =
  | 'temporal'
  | 'topic_similarity'
  | 'same_agent'
  | 'same_chamber'
  | 'delegation';

/** A node in the interaction knowledge graph */
export interface InteractionNode {
  id: string;
  rootPairId: string;
  chamberId: number | null;
  rootNorm: number;
  agentId: string;
  timestamp: number;
  edges: Map<string, InteractionEdge>;
  degree: number;
  localClusteringCoeff: number;
}

/** An edge in the interaction knowledge graph */
export interface InteractionEdge {
  sourceId: string;
  targetId: string;
  type: InteractionEdgeType;
  weight: number;
  metadata?: Record<string, any>;
}

/** A node in the agent topology graph */
export interface AgentNode {
  agentId: string;
  totalInteractions: number;
  avgRootNorm: number;
  chamberSpecialization: Record<number, number>;
  edges: Map<string, AgentEdge>;
}

/** An edge in the agent topology graph (delegation/collaboration pattern) */
export interface AgentEdge {
  sourceAgentId: string;
  targetAgentId: string;
  delegationCount: number;
  avgDelegationSuccess: number;
  chamberFlow: Record<number, number>;
}

/** Spectral properties of the agent graph */
export interface GraphSpectrum {
  eigenvalues: number[];
  spectralGap: number;
  algebraicConnectivity: number;
}

// ════════════════════════════════════════════════════════════
// CONTEXT FILTER TYPES
// ════════════════════════════════════════════════════════════

/** Result of context filtering */
export interface FilterResult {
  filteredPairs: RootPair[];
  chamberMatches: RootPair[];
  graphNeighborMatches: RootPair[];
  reflectionMatches: RootPair[];

  originalTokenCount: number;
  filteredTokenCount: number;
  tokensSaved: number;
  percentSaved: number;

  retrievalBreakdown: {
    byChamber: number;
    byGraph: number;
    byReflection: number;
    byRecency: number;
  };
}

// ════════════════════════════════════════════════════════════
// ROUTING TYPES
// ════════════════════════════════════════════════════════════

export type ModelTier = 'fast' | 'balanced' | 'powerful';

export interface RoutingDecision {
  selectedModel: string;
  modelTier: ModelTier;
  chamberId: number | null;
  confidence: number;

  estimatedCostWithout: number;
  estimatedCostWith: number;
  estimatedSavings: number;

  contextTokensBefore: number;
  contextTokensAfter: number;

  recommendedAgentId?: string;

  reasoning: string;
}

// ════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════

export interface ModelConfig {
  fast: string;
  balanced: string;
  powerful: string;
  costPer1MInput: { fast: number; balanced: number; powerful: number };
  costPer1MOutput: { fast: number; balanced: number; powerful: number };
}

/** Which tiers had explicit MODEL_* env vars at boot (override catalog for that tier). */
export type ModelTierOverrides = Partial<Record<ModelTier, boolean>>;

export type ModelCatalogMode = 'off' | 'auto' | 'venice' | 'openrouter';

export interface RouterConfig {
  models: ModelConfig;

  /**
   * Model catalog routing: off = legacy MODEL_* only; auto = infer from LLM_BASE_URL;
   * venice | openrouter = explicit provider graph.
   */
  modelCatalog?: ModelCatalogMode;
  /** Per-tier flags: true when MODEL_FAST/BALANCED/POWERFUL was set in env at boot. */
  modelTierOverrides?: ModelTierOverrides;
  /** Venice catalog privacy preference (default private). */
  venicePrivacy?: 'private' | 'anonymized';

  easyNormThreshold: number;
  mediumNormThreshold: number;

  maxContextTokens: number;
  reflectionContextEnabled: boolean;

  pcaDimensions: number;
  chamberCount: number;
  minInteractionsBeforeFit: number;
  refitInterval: number;

  topicSimilarityThreshold: number;
  maxGraphNeighborDepth: number;

  useLocalEmbeddings: boolean;
  embeddingModel: string;
  embeddingApiUrl: string;
  embeddingApiKey: string;
  embeddingDimension: number;

  llmBaseUrl: string;
  llmApiKey: string;

  celoRpcUrl: string;
  celoPrivateKey: string;
  telemetryContractAddress: string;

  verbose: boolean;

  /**
   * SAFE_MODE: when true, disables on-chain writes, forces cheap model default, caps maxContextTokens.
   * Suitable for CI, staging, or missing credentials.
   */
  safeMode?: boolean;

  /** Optional RNG for reproducible benchmarks (e.g. mock LLM output). Same seed => same results. */
  random?: () => number;
}

// ════════════════════════════════════════════════════════════
// CHAT PIPELINE STAGE TYPES
// ════════════════════════════════════════════════════════════

/** Input to retrieveContext stage */
export interface RetrieveContextInput {
  query: string;
  intentVector: Vector;
  isWarm: boolean;
  queryChamberId: number | null;
  skipContextFilter: boolean;
}

/** Output of retrieveContext stage */
export interface RetrieveContextOutput {
  filterResult: FilterResult;
  contextTokensBefore: number;
}

/** Input to routeModel stage */
export interface RouteModelInput {
  intentVector: Vector;
  queryChamberId: number | null;
  contextTokensBefore: number;
  contextTokensAfter: number;
  skipRouting: boolean;
  forceModel?: string;
  messages?: Array<{ role: string; content: unknown }>;
}

/** Output of routeModel stage */
export interface RouteModelOutput {
  routingDecision: RoutingDecision;
}

/** Input to buildPrompt stage */
export interface BuildPromptInput {
  filterResult: FilterResult;
  userMessages: Array<{ role: string; content: string }>;
}

/** Output of buildPrompt stage */
export interface BuildPromptOutput {
  messages: Array<{ role: string; content: string }>;
}

/** Input to executeLLM stage */
export interface ExecuteLLMInput {
  model: string;
  messages: Array<{ role: string; content: string }>;
}

/** Output of executeLLM stage */
export interface ExecuteLLMOutput {
  response: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

/** Input to recordTelemetry stage (metrics + optional on-chain queue) */
export interface RecordTelemetryInput {
  agentId: string;
  rootPair: RootPair;
  routingDecision: RoutingDecision;
  filterResult: FilterResult;
  tokensSaved: number;
  costSaved: number;
}

/** Result of boot validation */
export interface BootValidationResult {
  llmConfigured: boolean;
  simulatedMode: boolean;
  celoConfigured: boolean;
  telemetryFallback: 'celo' | 'local';
  safeMode: boolean;
  warnings: string[];
}

// ════════════════════════════════════════════════════════════
// TELEMETRY TYPES
// ════════════════════════════════════════════════════════════

export interface TelemetrySummary {
  totalInteractions: number;
  totalTokensSaved: number;
  totalCostSaved: number;
  avgRootNorm: number;

  chambers: Chamber[];

  agents: {
    agentId: string;
    interactions: number;
    avgRootNorm: number;
    primaryChambers: number[];
    tokensSaved: number;
  }[];

  graphStats: {
    nodeCount: number;
    edgeCount: number;
    avgDegree: number;
    components: number;
    spectralGap: number;
  };

  vectorSpaceStats: {
    rootDirectionsFound: number;
    varianceExplained: number;
    activeChambers: number;
  };

  topModel: string;
  recommendation: string;
}

/** On-chain telemetry entry */
export interface TelemetryEntry {
  agentAddress: string;
  chamberId: number;
  rootNorm: number;
  modelTier: number;
  tokensSaved: number;
  timestamp: number;
}
