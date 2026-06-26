import type {
  RouteModelInput,
  RouteModelOutput,
  RoutingDecision,
  ModelTier,
  RouterConfig,
} from '../types';
import type { ChatPipelineDeps } from './types';

/**
 * Stage: routeModel
 * Selects model tier from chamber/context. SAFE_MODE forces cheap model.
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

  // SAFE_MODE: override to cheap model
  if (config.safeMode && routingDecision.selectedModel !== config.models.fast) {
    routingDecision.selectedModel = config.models.fast;
    routingDecision.modelTier = 'fast';
    routingDecision.reasoning = `SAFE_MODE: overridden to fast model. Original: ${routingDecision.reasoning}`;
  }

  return { routingDecision };
}

function resolveForcedModel(config: RouterConfig, forceModel?: string, skipRouting?: boolean): string {
  if (forceModel) return forceModel;
  if (config.safeMode) return config.models.fast;
  return config.models.balanced;
}
