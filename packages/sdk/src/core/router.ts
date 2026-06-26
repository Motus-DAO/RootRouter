import { RoutingDecision, ModelTier, Vector, RouterConfig } from '../types';
import { StructuredVectorSpace } from './vectorSpace';
import { AgentTopologyGraph } from './agentGraph';
import { norm } from '../math/vectors';

/**
 * ModelRouter: Routes queries to optimal model tier using chamber analysis.
 * Uses percentile-based routing within the actual norm distribution.
 */
export class ModelRouter {
  route(params: {
    queryVector: Vector;
    chamberId: number | null;
    contextTokensBefore: number;
    contextTokensAfter: number;
    vectorSpace: StructuredVectorSpace | null;
    agentGraph: AgentTopologyGraph | null;
    config: RouterConfig;
  }): RoutingDecision {
    const { queryVector, chamberId, contextTokensBefore, contextTokensAfter, vectorSpace, agentGraph, config } = params;

    let modelTier: ModelTier = 'balanced';
    let confidence = 0.3;
    let reasoning = '';

    if (vectorSpace?.isFitted() && chamberId !== null) {
      const allChambers = vectorSpace.getAllChambers();
      const chamber = vectorSpace.getChamber(chamberId);

      if (chamber && chamber.interactionCount > 0 && allChambers.length > 1) {
        // Percentile-based routing: rank this chamber's norm among all chambers
        const norms = allChambers.map(c => c.avgRootNorm).sort((a, b) => a - b);
        const rank = norms.filter(n => n <= chamber.avgRootNorm).length;
        const percentile = rank / norms.length;

        if (percentile <= 0.33) {
          modelTier = 'fast';
          reasoning = `Chamber ${chamberId} norm ${chamber.avgRootNorm.toFixed(3)} is in the bottom third (easy) → fast model`;
          confidence = Math.min(0.95, 0.5 + chamber.interactionCount * 0.03);
        } else if (percentile <= 0.66) {
          modelTier = 'balanced';
          reasoning = `Chamber ${chamberId} norm ${chamber.avgRootNorm.toFixed(3)} is in the middle third (medium) → balanced model`;
          confidence = Math.min(0.9, 0.5 + chamber.interactionCount * 0.02);
        } else {
          modelTier = 'powerful';
          reasoning = `Chamber ${chamberId} norm ${chamber.avgRootNorm.toFixed(3)} is in the top third (hard) → powerful model`;
          confidence = Math.min(0.9, 0.5 + chamber.interactionCount * 0.02);
        }
      } else if (chamber) {
        reasoning = `Chamber ${chamberId} — insufficient data for ranking → balanced model`;
      } else {
        reasoning = `Chamber ${chamberId} not yet populated → balanced model`;
      }
    } else {
      reasoning = 'Vector space not yet fitted (cold start) → balanced model';
    }

    const selectedModel = config.models[modelTier];

    // Cost estimation
    const costPerInputToken = config.models.costPer1MInput[modelTier] / 1_000_000;
    const costPerOutputToken = config.models.costPer1MOutput[modelTier] / 1_000_000;
    const estimatedOutputTokens = 200;

    const estimatedCostWith =
      contextTokensAfter * costPerInputToken +
      estimatedOutputTokens * costPerOutputToken;

    // "Without" = powerful model + full context
    const costPerInputPowerful = config.models.costPer1MInput.powerful / 1_000_000;
    const costPerOutputPowerful = config.models.costPer1MOutput.powerful / 1_000_000;
    const estimatedCostWithout =
      contextTokensBefore * costPerInputPowerful +
      estimatedOutputTokens * costPerOutputPowerful;

    const estimatedSavings = Math.max(0, estimatedCostWithout - estimatedCostWith);

    // Agent recommendation
    let recommendedAgentId: string | undefined;
    if (agentGraph && chamberId !== null) {
      const best = agentGraph.getBestAgentForChamber(chamberId);
      if (best) recommendedAgentId = best.agentId;
    }

    return {
      selectedModel,
      modelTier,
      chamberId,
      confidence,
      estimatedCostWithout,
      estimatedCostWith,
      estimatedSavings,
      contextTokensBefore,
      contextTokensAfter,
      recommendedAgentId,
      reasoning,
    };
  }
}
