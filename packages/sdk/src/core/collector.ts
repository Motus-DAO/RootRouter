import { RootPair, Vector, RouterConfig, ModelTier } from '../types';
import { v4 as uuid } from 'uuid';
import { vectorSubtract, norm, estimateTokens } from '../math/vectors';

/**
 * RootPairCollector: Collects and manages root pairs from agent interactions.
 * Every interaction flows through here — it computes the root vector (intent-execution gap)
 * and stores the full telemetry record.
 */
export class RootPairCollector {
  private history: RootPair[] = [];
  private listeners: Array<(pair: RootPair) => void> = [];

  async record(params: {
    agentId: string;
    query: string;
    response: string;
    modelUsed: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    intentVector: Vector;
    executionVector: Vector;
  }): Promise<RootPair> {
    const rootVector = vectorSubtract(params.intentVector, params.executionVector);
    const rootNorm = norm(rootVector);
    const totalTokens = params.inputTokens + params.outputTokens;

    const tier = this.inferTier(params.modelUsed);
    const estimatedCostUsd =
      (params.inputTokens / 1_000_000) * this.inputCost(tier) +
      (params.outputTokens / 1_000_000) * this.outputCost(tier);

    const pair: RootPair = {
      id: uuid(),
      timestamp: Date.now(),
      agentId: params.agentId,
      modelUsed: params.modelUsed,
      query: params.query,
      response: params.response,
      intentVector: params.intentVector,
      executionVector: params.executionVector,
      rootVector,
      rootNorm,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens,
      estimatedCostUsd,
      latencyMs: params.latencyMs,
      chamberId: null,
      graphNodeId: null,
    };

    this.history.push(pair);
    for (const listener of this.listeners) listener(pair);
    return pair;
  }

  onNewPair(listener: (pair: RootPair) => void): void {
    this.listeners.push(listener);
  }

  getHistory(): RootPair[] {
    return this.history;
  }

  getByChamber(chamberId: number): RootPair[] {
    return this.history.filter(p => p.chamberId === chamberId);
  }

  getByAgent(agentId: string): RootPair[] {
    return this.history.filter(p => p.agentId === agentId);
  }

  getRecent(n: number): RootPair[] {
    return this.history.slice(-n);
  }

  getRootVectors(): Vector[] {
    return this.history.map(p => p.rootVector);
  }

  get count(): number {
    return this.history.length;
  }

  export(): string {
    return JSON.stringify(this.history);
  }

  import(json: string): void {
    const data = JSON.parse(json) as RootPair[];
    this.history.push(...data);
  }

  private inferTier(model: string): ModelTier {
    const m = model.toLowerCase();
    if (m.includes('haiku') || m.includes('fast') || m.includes('mini')) return 'fast';
    if (m.includes('opus') || m.includes('powerful') || m.includes('gpt-4')) return 'powerful';
    return 'balanced';
  }

  private inputCost(tier: ModelTier): number {
    const costs: Record<ModelTier, number> = { fast: 0.80, balanced: 3.00, powerful: 15.00 };
    return costs[tier];
  }

  private outputCost(tier: ModelTier): number {
    const costs: Record<ModelTier, number> = { fast: 4.00, balanced: 15.00, powerful: 75.00 };
    return costs[tier];
  }
}
