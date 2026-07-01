import {
  detectCapabilities,
  estimateMessagesTokens,
  lastUserMessageText,
  resolveModelForRouting,
  type ModelTier,
  type RouterConfig,
} from 'rootrouter';
import type { ChatMessage } from './filter.js';

interface AgentStats {
  requestCount: number;
  rollingAvgTokens: number;
}

const agentStats = new Map<string, AgentStats>();

export interface LightweightRoutingInput {
  messages: ChatMessage[];
  agentId: string;
  config: RouterConfig;
  forceModel?: boolean;
}

export interface LightweightRoutingResult {
  applied: boolean;
  modelId: string;
  tier: ModelTier;
  capabilities: string[];
  reasoning: string;
}

/**
 * Heuristic tier selection — no embeddings or chambers (low latency).
 */
export function estimateTierLightweight(
  messages: ChatMessage[],
  agentId: string,
  contextTokens: number
): ModelTier {
  const stats = agentStats.get(agentId) ?? { requestCount: 0, rollingAvgTokens: 0 };
  stats.requestCount += 1;
  const n = stats.requestCount;
  stats.rollingAvgTokens = stats.rollingAvgTokens * ((n - 1) / n) + contextTokens / n;
  agentStats.set(agentId, stats);

  const capabilities = detectCapabilities(messages, contextTokens);
  const lastText = lastUserMessageText(messages);
  const queryLen = lastText.length;

  if (capabilities.includes('long-context')) return 'powerful';
  if (capabilities.includes('reasoning') && contextTokens > 3_000) return 'powerful';
  if (capabilities.includes('code') && contextTokens > 4_000) return 'powerful';
  if (contextTokens > 12_000 || queryLen > 2_000) return 'powerful';
  if (stats.rollingAvgTokens > 10_000 && stats.requestCount > 3) return 'powerful';

  if (
    contextTokens < 1_500 &&
    queryLen < 200 &&
    !capabilities.includes('vision') &&
    !capabilities.includes('code')
  ) {
    return 'fast';
  }
  if (contextTokens < 800 && queryLen < 80) return 'fast';

  return 'balanced';
}

function resolveModelId(
  config: RouterConfig,
  tier: ModelTier,
  capabilities: ReturnType<typeof detectCapabilities>
): { modelId: string; viaCatalog: boolean } {
  const catalog = resolveModelForRouting(config, { tier, capabilities });
  if (catalog) {
    return { modelId: catalog.modelId, viaCatalog: !catalog.fromOverride };
  }
  return { modelId: config.models[tier], viaCatalog: false };
}

/**
 * Pick model for proxy request: lightweight tier + SDK capability/catalog resolver.
 */
export function applyLightweightModelRouting(
  input: LightweightRoutingInput
): LightweightRoutingResult | null {
  if (input.forceModel) return null;

  const contextTokens = estimateMessagesTokens(input.messages);
  const capabilities = detectCapabilities(input.messages, contextTokens);
  const tier = estimateTierLightweight(input.messages, input.agentId, contextTokens);
  const { modelId, viaCatalog } = resolveModelId(input.config, tier, capabilities);

  const capNote =
    capabilities.filter((c) => c !== 'chat').join(', ') || 'chat';
  const reasoning = viaCatalog
    ? `lightweight tier=${tier} → catalog: ${modelId} (${capNote})`
    : `lightweight tier=${tier} → ${modelId} (${capNote})`;

  return {
    applied: true,
    modelId,
    tier,
    capabilities,
    reasoning,
  };
}

/** Reset per-agent stats (tests). */
export function resetAgentStatsForTests(): void {
  agentStats.clear();
}
