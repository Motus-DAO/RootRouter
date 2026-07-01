import type {
  RouteModelInput,
  RouteModelOutput,
  RoutingDecision,
  ModelTier,
  RouterConfig,
} from '../types';
import type { ChatPipelineDeps } from './types';
import { detectCapabilities } from '../models/detectCapabilities';
import { resolveModelForRouting } from '../models/registry';

/**
 * Stage: routeModel
 * Selects model tier from chamber/context, then resolves provider catalog when enabled.
 * SAFE_MODE forces cheap model.
 */
export function routeModel(deps: ChatPipelineDeps, input: RouteModelInput): RouteModelOutput {
  const { modelRouter, vectorSpace, agentGraph, config } = deps;
  const {
    intentVector,
    queryChamberId,
    contextTokensBefore,
    contextTokensAfter,
    skipRouting,
    forceModel,
    messages = [],
  } = input;

  const effectiveModel = resolveForcedModel(config, forceModel, skipRouting);

  if (skipRouting || forceModel) {
    const routingDecision: RoutingDecision = {
      selectedModel: effectiveModel,
      modelTier: 'balanced' as ModelTier,
      chamberId: queryChamberId,
      confidence: forceModel ? 1.0 : 0.3,
      estimatedCostWithout: 0,
      estimatedCostWith: 0,
      estimatedSavings: 0,
      contextTokensBefore,
      contextTokensAfter,
      reasoning: forceModel ? `Forced model: ${effectiveModel}` : 'Routing skipped',
    };
    return { routingDecision };
  }

  const routingDecision = modelRouter.route({
    queryVector: intentVector,
    chamberId: queryChamberId,
    contextTokensBefore,
    contextTokensAfter,
    vectorSpace: vectorSpace.isFitted() ? vectorSpace : null,
    agentGraph,
    config,
  });

  applyCatalogRouting(routingDecision, config, messages, contextTokensBefore);

  // SAFE_MODE: override to cheap model
  if (config.safeMode) {
    const fastModel = resolveFastModel(config, messages, contextTokensBefore);
    if (routingDecision.selectedModel !== fastModel) {
      routingDecision.selectedModel = fastModel;
      routingDecision.modelTier = 'fast';
      routingDecision.reasoning = `SAFE_MODE: overridden to fast model. Original: ${routingDecision.reasoning}`;
    }
  }

  return { routingDecision };
}

function applyCatalogRouting(
  routingDecision: RoutingDecision,
  config: RouterConfig,
  messages: Array<{ role: string; content: unknown }>,
  contextTokensBefore: number
): void {
  const capabilities = detectCapabilities(messages, contextTokensBefore);
  const resolved = resolveModelForRouting(config, {
    tier: routingDecision.modelTier,
    capabilities,
  });

  if (!resolved) return;

  const capNote =
    capabilities.length > 1
      ? capabilities.filter((c) => c !== 'chat').join(', ')
      : 'chat';

  const catalogNote = resolved.fromOverride
    ? `tier override: ${resolved.modelId}`
    : `catalog (${resolved.catalogId}): ${resolved.modelId} (${capNote})`;

  routingDecision.selectedModel = resolved.modelId;
  routingDecision.reasoning = `${routingDecision.reasoning} → ${catalogNote}`;
}

function resolveFastModel(
  config: RouterConfig,
  messages: Array<{ role: string; content: unknown }>,
  contextTokensBefore: number
): string {
  const capabilities = detectCapabilities(messages, contextTokensBefore);
  const resolved = resolveModelForRouting(config, { tier: 'fast', capabilities });
  if (resolved) return resolved.modelId;
  return config.models.fast;
}

function resolveForcedModel(config: RouterConfig, forceModel?: string, skipRouting?: boolean): string {
  if (forceModel) return forceModel;
  if (config.safeMode) return config.models.fast;
  return config.models.balanced;
}
