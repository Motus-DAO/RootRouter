import { v4 as uuid } from 'uuid';
import { RootPair, RoutingDecision, TelemetrySummary, FilterResult, RouterConfig, Vector, ModelTier } from './types';
import { loadConfig, validateBoot } from './config';
import { RootPairCollector } from './core/collector';
import { StructuredVectorSpace } from './core/vectorSpace';
import { InteractionGraph } from './core/graph';
import { AgentTopologyGraph } from './core/agentGraph';
import { ContextFilter } from './core/contextFilter';
import { ModelRouter } from './core/router';
import { CeloTelemetry } from './celo/telemetry';
import { ERC8004Registration } from './celo/erc8004';
import { LocalTelemetryFallback } from './logs/localTelemetry';
import { TfIdfVectorizer } from './embeddings/tfidf';
import { embed as apiEmbed } from './embeddings/api';
import { vectorSubtract, norm, estimateTokens } from './math/vectors';
import {
  retrieveContext,
  routeModel,
  buildPrompt,
  executeLLM,
  recordTelemetry,
  type ChatPipelineDeps,
  type ITelemetrySink,
} from './pipeline';
import {
  appendRouterMetrics,
  appendRouterMetricsError,
  buildRouterMetricsEntry,
} from './logs/routerMetrics';

/**
 * RootRouter: Main orchestrator for algebraic agent infrastructure.
 * Coordinates collector, vector space, graphs, context filter, model router, and telemetry (Celo or local fallback).
 */
export class RootRouter {
  private collector: RootPairCollector;
  private vectorSpace: StructuredVectorSpace;
  private interactionGraph: InteractionGraph;
  private agentGraph: AgentTopologyGraph;
  private contextFilter: ContextFilter;
  private modelRouter: ModelRouter;
  private telemetry: ITelemetrySink;
  private celoTelemetry: CeloTelemetry;
  private erc8004: ERC8004Registration;
  private config: RouterConfig;
  private interactionsSinceFit: number = 0;
  private tfidf: TfIdfVectorizer;
  private allTexts: string[] = [];
  private pairIndex: Map<string, RootPair> = new Map();

  // Cumulative telemetry
  private totalTokensSaved: number = 0;
  private totalCostSaved: number = 0;

  constructor(configOverrides?: Partial<RouterConfig>) {
    this.config = loadConfig(configOverrides);
    const boot = validateBoot(this.config);
    for (const w of boot.warnings) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[RootRouter] ${w}`);
      }
    }
    this.collector = new RootPairCollector();
    this.vectorSpace = new StructuredVectorSpace(this.config.pcaDimensions);
    this.interactionGraph = new InteractionGraph();
    this.agentGraph = new AgentTopologyGraph();
    this.contextFilter = new ContextFilter();
    this.modelRouter = new ModelRouter();
    this.celoTelemetry = new CeloTelemetry(this.config);
    this.telemetry = boot.telemetryFallback === 'celo' && this.celoTelemetry.isConfigured()
      ? (this.celoTelemetry as ITelemetrySink)
      : new LocalTelemetryFallback();
    this.erc8004 = new ERC8004Registration(this.config);
    this.tfidf = new TfIdfVectorizer(this.config.embeddingDimension);
  }

  private getPipelineDeps(): ChatPipelineDeps {
    return {
      collector: this.collector,
      vectorSpace: this.vectorSpace,
      interactionGraph: this.interactionGraph,
      agentGraph: this.agentGraph,
      contextFilter: this.contextFilter,
      modelRouter: this.modelRouter,
      config: this.config,
      telemetry: this.telemetry,
    };
  }

  async chat(params: {
    agentId: string;
    messages: Array<{ role: string; content: string }>;
    forceModel?: string;
    skipContextFilter?: boolean;
    skipRouting?: boolean;
  }): Promise<{
    response: string;
    routingDecision: RoutingDecision;
    filterResult: FilterResult;
    rootPair: RootPair;
    telemetry: {
      tokensSaved: number;
      costSaved: number;
      chamberUsed: number | null;
      modelUsed: string;
      isWarmStart: boolean;
    };
  }> {
    const { agentId, messages } = params;
    const runId = uuid();
    const queryId = uuid();
    const stageErrors: Record<string, string> = {};
    const deps = this.getPipelineDeps();

    const userMessages = messages.filter(m => m.role === 'user');
    const query = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

    let intentVector: Vector;
    try {
      intentVector = await this.embed(query);
    } catch (err) {
      stageErrors.embed = err instanceof Error ? err.message : String(err);
      appendRouterMetricsError({ ts: Date.now(), run_id: runId, query_id: queryId, stage_errors: stageErrors });
      throw err;
    }

    const isWarm = this.vectorSpace.isFitted();
    const queryChamberId = isWarm ? this.vectorSpace.classifyQuery(intentVector) : null;

    let ctxOut: { filterResult: FilterResult; contextTokensBefore: number };
    try {
      ctxOut = retrieveContext(deps, {
        query,
        intentVector,
        isWarm,
        queryChamberId,
        skipContextFilter: params.skipContextFilter ?? false,
      });
    } catch (err) {
      stageErrors.retrieveContext = err instanceof Error ? err.message : String(err);
      appendRouterMetricsError({ ts: Date.now(), run_id: runId, query_id: queryId, stage_errors: stageErrors });
      throw err;
    }

    const { filterResult, contextTokensBefore } = ctxOut;

    let routeOut: { routingDecision: RoutingDecision };
    try {
      routeOut = routeModel(deps, {
        intentVector,
        queryChamberId,
        contextTokensBefore,
        contextTokensAfter: filterResult.filteredTokenCount,
        skipRouting: params.skipRouting ?? false,
        forceModel: params.forceModel,
        messages,
      });
    } catch (err) {
      stageErrors.routeModel = err instanceof Error ? err.message : String(err);
      appendRouterMetricsError({ ts: Date.now(), run_id: runId, query_id: queryId, stage_errors: stageErrors });
      throw err;
    }

    const { routingDecision } = routeOut;
    const promptOut = buildPrompt({ filterResult, userMessages });

    let llmResult: { response: string; inputTokens: number; outputTokens: number; latencyMs: number };
    try {
      llmResult = await executeLLM(
        this.config,
        { model: routingDecision.selectedModel, messages: promptOut.messages },
        (p) => this.callLLM(p)
      );
    } catch (err) {
      stageErrors.executeLLM = err instanceof Error ? err.message : String(err);
      appendRouterMetrics(buildRouterMetricsEntry({
        runId,
        queryId,
        filterResult,
        routingDecision,
        isWarmStart: isWarm,
        stageErrors,
      }));
      throw err;
    }

    let executionVector: Vector;
    try {
      executionVector = await this.embed(llmResult.response);
    } catch (err) {
      stageErrors.embedResponse = err instanceof Error ? err.message : String(err);
      appendRouterMetrics(buildRouterMetricsEntry({
        runId,
        queryId,
        filterResult,
        routingDecision,
        isWarmStart: isWarm,
        stageErrors,
      }));
      throw err;
    }

    let rootPair: RootPair;
    try {
      rootPair = await this.collector.record({
        agentId,
        query,
        response: llmResult.response,
        modelUsed: routingDecision.selectedModel,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
        latencyMs: llmResult.latencyMs,
        intentVector,
        executionVector,
      });
    } catch (err) {
      stageErrors.recordState = err instanceof Error ? err.message : String(err);
      appendRouterMetrics(buildRouterMetricsEntry({
        runId,
        queryId,
        filterResult,
        routingDecision,
        isWarmStart: isWarm,
        stageErrors,
      }));
      throw err;
    }

    if (isWarm) {
      rootPair.chamberId = this.vectorSpace.classify(rootPair.rootVector);
    }

    this.pairIndex.set(rootPair.id, rootPair);
    const graphNode = this.interactionGraph.addNode(rootPair);
    this.interactionGraph.detectEdges(
      graphNode.id,
      { topicThreshold: this.config.topicSimilarityThreshold, maxRecentToCheck: 50 },
      this.pairIndex
    );
    this.agentGraph.recordInteraction(agentId, rootPair);

    this.interactionsSinceFit++;
    if (this.collector.count >= this.config.minInteractionsBeforeFit &&
        (this.interactionsSinceFit >= this.config.refitInterval || !isWarm)) {
      this.refit();
    }

    const tokensSaved = filterResult.tokensSaved;
    const costSaved = routingDecision.estimatedSavings;
    this.totalTokensSaved += tokensSaved;
    this.totalCostSaved += costSaved;

    recordTelemetry(deps, {
      agentId,
      rootPair,
      routingDecision,
      filterResult,
      tokensSaved,
      costSaved,
    });

    appendRouterMetrics(buildRouterMetricsEntry({
      runId,
      queryId,
      filterResult,
      routingDecision,
      isWarmStart: isWarm,
      stageErrors: Object.keys(stageErrors).length > 0 ? stageErrors : undefined,
    }));

    return {
      response: llmResult.response,
      routingDecision,
      filterResult,
      rootPair,
      telemetry: {
        tokensSaved,
        costSaved,
        chamberUsed: rootPair.chamberId,
        modelUsed: routingDecision.selectedModel,
        isWarmStart: isWarm,
      },
    };
  }

  private async embed(text: string): Promise<Vector> {
    if (this.config.useLocalEmbeddings) {
      // Incrementally fit TF-IDF
      this.allTexts.push(text);
      if (this.allTexts.length <= 5 || this.allTexts.length % 10 === 0) {
        this.tfidf.fit(this.allTexts);
      }
      return this.tfidf.transform(text);
    }
    return apiEmbed(text, this.config);
  }

  private async callLLM(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
  }): Promise<{
    response: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  }> {
    // If no API key, simulate
    if (!this.config.llmApiKey) {
      const rng = this.config.random ?? Math.random;
      const inputTokens = params.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
      const outputTokens = 50 + Math.floor(rng() * 250);
      const query = params.messages.filter(m => m.role === 'user').pop()?.content ?? '';
      return {
        response: this.simulateResponse(query),
        inputTokens,
        outputTokens,
        latencyMs: 100 + Math.floor(rng() * 400),
      };
    }

    // Real API call
    const start = Date.now();
    const isNvidia = this.config.llmBaseUrl.includes('nvidia.com');
    const maxOut = parseInt(process.env.LLM_MAX_OUTPUT_TOKENS ?? '512', 10);
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      max_tokens: maxOut,
      temperature: 0.7,
    };
    if (isNvidia) {
      // Thinking models: disable for shorter benchmark runs unless explicitly enabled
      const thinkingOn = process.env.NVIDIA_ENABLE_THINKING === 'true';
      if (!thinkingOn) {
        body.chat_template_kwargs = { enable_thinking: false };
      }
    } else {
      body.max_completion_tokens = maxOut;
    }

    const response = await fetch(`${this.config.llmBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.llmApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM API error (${response.status}): ${text}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string | null; reasoning_content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const latencyMs = Date.now() - start;
    const message = data.choices?.[0]?.message;
    const text =
      message?.content?.trim() ||
      (typeof message?.reasoning_content === 'string' ? message.reasoning_content.trim() : '') ||
      '';

    if (!text) {
      throw new Error('LLM API returned empty content');
    }

    return {
      response: text,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      latencyMs,
    };
  }

  private simulateResponse(query: string): string {
    const q = query.toLowerCase();
    if (q.includes('function') || q.includes('code') || q.includes('implement') || q.includes('write a') || q.includes('debug') || q.includes('algorithm')) {
      return `Here's a clean implementation approach for your request. The key insight is to use efficient data structures and follow established patterns. I'd recommend starting with the core logic, then adding error handling and tests. The time complexity would be O(n log n) for the main operation.`;
    }
    if (q.includes('email') || q.includes('blog') || q.includes('draft') || q.includes('write') || q.includes('summarize')) {
      return `I've drafted the content with a clear structure: opening hook, main points organized by importance, supporting details, and a strong conclusion. The tone is professional yet approachable, appropriate for the target audience.`;
    }
    if (q.includes('integral') || q.includes('equation') || q.includes('prove') || q.includes('calculate') || q.includes('math')) {
      return `Using the fundamental theorem and applying substitution, we can solve this step by step. First, identify the key variables and constraints. Then apply the appropriate method — in this case integration by parts yields the most elegant solution. The final answer simplifies to a closed form.`;
    }
    if (q.includes('story') || q.includes('creative') || q.includes('brainstorm') || q.includes('design') || q.includes('logo') || q.includes('ideas')) {
      return `Here's a creative approach with three distinct directions. Option A focuses on minimalism and symbolism. Option B uses bold colors and dynamic composition. Option C takes inspiration from nature and organic forms. Each direction has unique strengths depending on the audience.`;
    }
    return `Based on my analysis, here are the key points to consider. The primary factors are efficiency, scalability, and maintainability. I'd recommend a balanced approach that addresses both immediate needs and long-term goals. The evidence supports this direction based on established best practices.`;
  }

  refit(): void {
    this.vectorSpace.fit(this.collector.getHistory());
    this.interactionsSinceFit = 0;

    // Reclassify all pairs
    if (this.vectorSpace.isFitted()) {
      for (const pair of this.collector.getHistory()) {
        pair.chamberId = this.vectorSpace.classify(pair.rootVector);
      }
    }
  }

  getTelemetry(): TelemetrySummary {
    const history = this.collector.getHistory();
    const graphStats = this.interactionGraph.getStats();
    const vsSummary = this.vectorSpace.getSummary();
    const chambers = this.vectorSpace.getAllChambers();

    // Per-agent breakdown
    const agentMap = new Map<string, { norms: number[]; tokens: number; chambers: Map<number, number> }>();
    for (const pair of history) {
      if (!agentMap.has(pair.agentId)) {
        agentMap.set(pair.agentId, { norms: [], tokens: 0, chambers: new Map() });
      }
      const a = agentMap.get(pair.agentId)!;
      a.norms.push(pair.rootNorm);
      if (pair.chamberId !== null) {
        a.chambers.set(pair.chamberId, (a.chambers.get(pair.chamberId) ?? 0) + 1);
      }
    }

    const agents = Array.from(agentMap.entries()).map(([agentId, data]) => {
      const avgNorm = data.norms.reduce((s, n) => s + n, 0) / data.norms.length;
      const sorted = Array.from(data.chambers.entries()).sort((a, b) => b[1] - a[1]);
      return {
        agentId,
        interactions: data.norms.length,
        avgRootNorm: avgNorm,
        primaryChambers: sorted.slice(0, 3).map(([id]) => id),
        tokensSaved: 0,
      };
    });

    const avgRootNorm = history.length > 0
      ? history.reduce((s, p) => s + p.rootNorm, 0) / history.length
      : 0;

    // Determine top model
    const modelCounts: Record<string, number> = {};
    for (const pair of history) {
      modelCounts[pair.modelUsed] = (modelCounts[pair.modelUsed] ?? 0) + 1;
    }
    const topModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';

    const spectrum = this.interactionGraph.getSpectrum();

    return {
      totalInteractions: history.length,
      totalTokensSaved: this.totalTokensSaved,
      totalCostSaved: this.totalCostSaved,
      avgRootNorm,
      chambers,
      agents,
      graphStats: {
        nodeCount: graphStats.nodeCount,
        edgeCount: graphStats.edgeCount,
        avgDegree: graphStats.avgDegree,
        components: 1,
        spectralGap: spectrum.spectralGap,
      },
      vectorSpaceStats: {
        rootDirectionsFound: vsSummary.directionsFound,
        varianceExplained: vsSummary.varianceExplained,
        activeChambers: vsSummary.activeChambers,
      },
      topModel,
      recommendation: this.generateRecommendation(history, chambers),
    };
  }

  private generateRecommendation(history: RootPair[], chambers: import('./types').Chamber[]): string {
    if (history.length < 10) return 'Collecting data — need more interactions for meaningful recommendations.';
    // Use percentile-based classification matching the router
    const norms = chambers.map(c => c.avgRootNorm).sort((a, b) => a - b);
    const p33 = norms[Math.floor(norms.length * 0.33)] ?? Infinity;
    const p66 = norms[Math.floor(norms.length * 0.66)] ?? Infinity;
    const easyCount = chambers.filter(c => c.avgRootNorm <= p33).length;
    const medCount = chambers.filter(c => c.avgRootNorm > p33 && c.avgRootNorm <= p66).length;
    const hardCount = chambers.filter(c => c.avgRootNorm > p66).length;
    return `Workload split: ${easyCount} easy, ${medCount} medium, ${hardCount} hard chambers. RootRouter routes fast models to easy tasks and powerful models to hard tasks for optimal cost/quality.`;
  }

  getCollector(): RootPairCollector { return this.collector; }
  getVectorSpace(): StructuredVectorSpace { return this.vectorSpace; }
  getInteractionGraph(): InteractionGraph { return this.interactionGraph; }
  getAgentGraph(): AgentTopologyGraph { return this.agentGraph; }
  getConfig(): RouterConfig { return this.config; }

  /** Flush queued telemetry (Celo logBatch or local file). Returns tx hash / path or null. */
  async flushTelemetry(): Promise<string | null> {
    if (this.config.safeMode) return null;
    return this.telemetry.flush();
  }

  exportState(): string {
    return JSON.stringify({
      history: this.collector.export(),
      totalTokensSaved: this.totalTokensSaved,
      totalCostSaved: this.totalCostSaved,
    });
  }

  /**
   * Build a serializable snapshot for Convex/dashboard (chambers, agent graph, vector space summary).
   * Use after a demo run to push topology data for visualization.
   */
  getSnapshotForExport(runId: string, agentId: string): {
    runId: string;
    agentId: string;
    snapshot: {
      summary: import('./types').TelemetrySummary;
      agentGraph: ReturnType<AgentTopologyGraph['exportForSnapshot']>;
      interactionGraph: ReturnType<InteractionGraph['exportForSnapshot']>;
      rootDirections: import('./types').RootDirection[];
      vectorSpaceSummary: ReturnType<StructuredVectorSpace['getSummary']>;
    };
  } {
    const summary = this.getTelemetry();
    const agentGraph = this.agentGraph.exportForSnapshot();
    const interactionGraph = this.interactionGraph.exportForSnapshot();
    const rootDirections = this.vectorSpace.getRootDirections();
    const vectorSpaceSummary = this.vectorSpace.getSummary();
    return {
      runId,
      agentId,
      snapshot: {
        summary,
        agentGraph,
        interactionGraph,
        rootDirections,
        vectorSpaceSummary,
      },
    };
  }

  importState(json: string): void {
    const data = JSON.parse(json);
    if (data.history) this.collector.import(data.history);
    if (data.totalTokensSaved) this.totalTokensSaved = data.totalTokensSaved;
    if (data.totalCostSaved) this.totalCostSaved = data.totalCostSaved;
    this.refit();
  }
}
