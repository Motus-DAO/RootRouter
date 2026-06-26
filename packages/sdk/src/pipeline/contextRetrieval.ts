import type {
  RetrieveContextInput,
  RetrieveContextOutput,
  FilterResult,
  RouterConfig,
} from '../types';
import type { ChatPipelineDeps } from './types';
import { estimateTokens } from '../math/vectors';
import { SAFE_MODE_MAX_CONTEXT_TOKENS } from '../config';

/**
 * Stage: retrieveContext
 * Computes filtered context and token counts from history.
 */
export function retrieveContext(
  deps: ChatPipelineDeps,
  input: RetrieveContextInput
): RetrieveContextOutput {
  const { collector, contextFilter, vectorSpace, interactionGraph, config } = deps;

  let contextTokensBefore = 0;
  for (const pair of collector.getHistory()) {
    contextTokensBefore += estimateTokens(pair.query) + estimateTokens(pair.response);
  }

  let filterResult: FilterResult;
  if (input.skipContextFilter || collector.count === 0) {
    filterResult = {
      filteredPairs: collector.getRecent(3),
      chamberMatches: [],
      graphNeighborMatches: [],
      reflectionMatches: [],
      originalTokenCount: contextTokensBefore,
      filteredTokenCount: contextTokensBefore,
      tokensSaved: 0,
      percentSaved: 0,
      retrievalBreakdown: { byChamber: 0, byGraph: 0, byReflection: 0, byRecency: 0 },
    };
  } else {
    const effectiveConfig = applySafeModeContextCap(config);
    filterResult = contextFilter.filter({
      queryVector: input.intentVector,
      queryChamberId: input.queryChamberId,
      allHistory: collector.getHistory(),
      vectorSpace: input.isWarm ? vectorSpace : null,
      graph: interactionGraph,
      config: effectiveConfig,
    });
  }

  return {
    filterResult,
    contextTokensBefore,
  };
}

function applySafeModeContextCap(config: RouterConfig): RouterConfig {
  if (!config.safeMode) return config;
  return {
    ...config,
    maxContextTokens: Math.min(config.maxContextTokens, SAFE_MODE_MAX_CONTEXT_TOKENS),
  };
}
