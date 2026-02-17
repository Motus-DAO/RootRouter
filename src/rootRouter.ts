import { RootPair, RoutingDecision, TelemetrySummary, FilterResult, RouterConfig, Vector, ModelTier } from './types';
import { loadConfig } from './config';
import { RootPairCollector } from './core/collector';
import { StructuredVectorSpace } from './core/vectorSpace';
import { InteractionGraph } from './core/graph';
import { AgentTopologyGraph } from './core/agentGraph';
import { ContextFilter } from './core/contextFilter';
import { ModelRouter } from './core/router';
import { CeloTelemetry } from './celo/telemetry';
import { ERC8004Registration } from './celo/erc8004';
import { TfIdfVectorizer } from './embeddings/tfidf';
import { embed as apiEmbed } from './embeddings/api';
import { vectorSubtract, norm, estimateTokens } from './math/vectors';

/**
 * RootRouter: Main orchestrator for algebraic agent infrastructure.
 * Coordinates collector, vector space, graphs, context filter, model router, and Celo telemetry.
 */
export class RootRouter {
  private collector: RootPairCollector;
  private vectorSpace: StructuredVectorSpace;
  private interactionGraph: InteractionGraph;
  private agentGraph: AgentTopologyGraph;
  private contextFilter: ContextFilter;
  private modelRouter: ModelRouter;
  private telemetry: CeloTelemetry;
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
    this.collector = new RootPairCollector();
    this.vectorSpace = new StructuredVectorSpace(this.config.pcaDimensions);
    this.interactionGraph = new InteractionGraph();
    this.agentGraph = new AgentTopologyGraph();
    this.contextFilter = new ContextFilter();
    this.modelRouter = new ModelRouter();
    this.telemetry = new CeloTelemetry(this.config);
    this.erc8004 = new ERC8004Registration(this.config);
    this.tfidf = new TfIdfVectorizer(this.config.embeddingDimension);
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

    // Extract latest user message
    const userMessages = messages.filter(m => m.role === 'user');
    const query = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

    // Embed query
    const intentVector = await this.embed(query);

    // Classify into chamber
    const isWarm = this.vectorSpace.isFitted();
    const queryChamberId = isWarm ? this.vectorSpace.classifyQuery(intentVector) : null;

    // Compute full context token count (before filtering)
    let contextTokensBefore = 0;
    for (const pair of this.collector.getHistory()) {
      contextTokensBefore += estimateTokens(pair.query) + estimateTokens(pair.response);
    }

    // Filter context
    let filterResult: FilterResult;
    if (params.skipContextFilter || this.collector.count === 0) {
      filterResult = {
        filteredPairs: this.collector.getRecent(3),
        chamberMatches: [], graphNeighborMatches: [], reflectionMatches: [],
        originalTokenCount: contextTokensBefore, filteredTokenCount: contextTokensBefore,
        tokensSaved: 0, percentSaved: 0,
        retrievalBreakdown: { byChamber: 0, byGraph: 0, byReflection: 0, byRecency: 0 },
      };
    } else {
      filterResult = this.contextFilter.filter({
        queryVector: intentVector,
        queryChamberId,
        allHistory: this.collector.getHistory(),
        vectorSpace: isWarm ? this.vectorSpace : null,
        graph: this.interactionGraph,
        config: this.config,
      });
    }

    // Route to model
    let routingDecision: RoutingDecision;
    if (params.skipRouting || params.forceModel) {
      const model = params.forceModel ?? this.config.models.balanced;
      routingDecision = {
        selectedModel: model,
        modelTier: 'balanced' as ModelTier,
        chamberId: queryChamberId,
        confidence: params.forceModel ? 1.0 : 0.3,
        estimatedCostWithout: 0, estimatedCostWith: 0, estimatedSavings: 0,
        contextTokensBefore, contextTokensAfter: filterResult.filteredTokenCount,
        reasoning: params.forceModel ? `Forced model: ${model}` : 'Routing skipped',
      };
    } else {
      routingDecision = this.modelRouter.route({
        queryVector: intentVector,
        chamberId: queryChamberId,
        contextTokensBefore,
        contextTokensAfter: filterResult.filteredTokenCount,
        vectorSpace: isWarm ? this.vectorSpace : null,
        agentGraph: this.agentGraph,
        config: this.config,
      });
    }

    // Build filtered message list
    const contextMessages: Array<{ role: string; content: string }> = [];
    for (const pair of filterResult.filteredPairs) {
      contextMessages.push({ role: 'user', content: pair.query });
      contextMessages.push({ role: 'assistant', content: pair.response });
    }
    contextMessages.push(...userMessages.slice(-1).map(m => ({ role: m.role, content: m.content })));

    // Make LLM call
    const llmResult = await this.callLLM({
      model: routingDecision.selectedModel,
      messages: contextMessages,
    });

    // Embed response
    const executionVector = await this.embed(llmResult.response);

    // Record root pair
    const rootPair = await this.collector.record({
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

    // Classify pair
    if (isWarm) {
      rootPair.chamberId = this.vectorSpace.classify(rootPair.rootVector);
    }

    // Add to graph
    this.pairIndex.set(rootPair.id, rootPair);
    const graphNode = this.interactionGraph.addNode(rootPair);
    this.interactionGraph.detectEdges(
      graphNode.id,
      { topicThreshold: this.config.topicSimilarityThreshold, maxRecentToCheck: 50 },
      this.pairIndex
    );

    // Update agent graph
    this.agentGraph.recordInteraction(agentId, rootPair);

    // Check refit
    this.interactionsSinceFit++;
    if (this.collector.count >= this.config.minInteractionsBeforeFit &&
        (this.interactionsSinceFit >= this.config.refitInterval || !isWarm)) {
      this.refit();
    }

    // Telemetry
    const tokensSaved = filterResult.tokensSaved;
    const costSaved = routingDecision.estimatedSavings;
    this.totalTokensSaved += tokensSaved;
    this.totalCostSaved += costSaved;

    // Queue Celo telemetry
    if (this.telemetry.isConfigured()) {
      const tierMap: Record<ModelTier, number> = { fast: 0, balanced: 1, powerful: 2 };
      this.telemetry.queue({
        agentAddress: agentId,
        chamberId: rootPair.chamberId ?? 0,
        rootNorm: rootPair.rootNorm,
        modelTier: tierMap[routingDecision.modelTier],
        tokensSaved,
        timestamp: Date.now(),
      });
    }

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
      const inputTokens = params.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
      const outputTokens = 50 + Math.floor(Math.random() * 250);
      const query = params.messages.filter(m => m.role === 'user').pop()?.content ?? '';
      return {
        response: this.simulateResponse(query),
        inputTokens,
        outputTokens,
        latencyMs: 100 + Math.floor(Math.random() * 400),
      };
    }

    // Real API call
    const start = Date.now();
    const response = await fetch(`${this.config.llmBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.llmApiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM API error (${response.status}): ${text}`);
    }

    const data = await response.json() as any;
    const latencyMs = Date.now() - start;

    return {
      response: data.choices[0].message.content,
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

  /** Flush queued telemetry to Celo (logBatch). Returns tx hash or null if not configured / nothing to send. */
  async flushTelemetry(): Promise<string | null> {
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
      rootDirections: import('./types').RootDirection[];
      vectorSpaceSummary: ReturnType<StructuredVectorSpace['getSummary']>;
    };
  } {
    const summary = this.getTelemetry();
    const agentGraph = this.agentGraph.exportForSnapshot();
    const rootDirections = this.vectorSpace.getRootDirections();
    const vectorSpaceSummary = this.vectorSpace.getSummary();
    return {
      runId,
      agentId,
      snapshot: {
        summary,
        agentGraph,
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
