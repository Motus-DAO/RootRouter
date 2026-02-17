import { RootPair, FilterResult, Vector, RouterConfig } from '../types';
import { StructuredVectorSpace } from './vectorSpace';
import { InteractionGraph } from './graph';
import { cosineSimilarity, estimateTokens } from '../math/vectors';

/**
 * ContextFilter combines three retrieval strategies:
 * 1. Chamber retrieval — same and adjacent Weyl chambers
 * 2. Graph retrieval — knowledge graph neighborhood traversal
 * 3. Reflection retrieval — algebraic mirror for complementary context
 * Plus recency bias (always include last N).
 */
export class ContextFilter {
  filter(params: {
    queryVector: Vector;
    queryChamberId: number | null;
    allHistory: RootPair[];
    vectorSpace: StructuredVectorSpace | null;
    graph: InteractionGraph | null;
    config: RouterConfig;
  }): FilterResult {
    const { queryVector, queryChamberId, allHistory, vectorSpace, graph, config } = params;

    const chamberMatches: RootPair[] = [];
    const graphNeighborMatches: RootPair[] = [];
    const reflectionMatches: RootPair[] = [];

    // Track IDs to deduplicate
    const included = new Set<string>();

    // 1. RECENCY: always include last 3
    const recencyCount = Math.min(3, allHistory.length);
    const recencyPairs = allHistory.slice(-recencyCount);
    for (const p of recencyPairs) included.add(p.id);

    // 2. CHAMBER RETRIEVAL
    if (vectorSpace?.isFitted() && queryChamberId !== null) {
      const adjacentIds = new Set(vectorSpace.getAdjacentChambers(queryChamberId));
      adjacentIds.add(queryChamberId);

      for (const pair of allHistory) {
        if (included.has(pair.id)) continue;
        if (pair.chamberId !== null && adjacentIds.has(pair.chamberId)) {
          chamberMatches.push(pair);
          included.add(pair.id);
        }
      }
      // Keep most recent chamber matches
      chamberMatches.sort((a, b) => b.timestamp - a.timestamp);
      if (chamberMatches.length > 15) chamberMatches.length = 15;
    }

    // 3. GRAPH RETRIEVAL
    if (graph) {
      // Find seed nodes: top 3 most similar from recent history
      const recentWithVec = allHistory
        .filter(p => p.graphNodeId && p.rootVector.length > 0 && !included.has(p.id))
        .slice(-50);

      const seeds = recentWithVec
        .map(p => ({ pair: p, sim: cosineSimilarity(queryVector, p.rootVector) }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 3);

      for (const seed of seeds) {
        if (!seed.pair.graphNodeId) continue;
        const neighbors = graph.getNeighborhood(seed.pair.graphNodeId, config.maxGraphNeighborDepth);
        for (const n of neighbors) {
          const pair = allHistory.find(p => p.graphNodeId === n.nodeId);
          if (pair && !included.has(pair.id)) {
            graphNeighborMatches.push(pair);
            included.add(pair.id);
          }
        }
      }
      if (graphNeighborMatches.length > 10) graphNeighborMatches.length = 10;
    }

    // 4. REFLECTION RETRIEVAL
    if (vectorSpace?.isFitted() && config.reflectionContextEnabled && queryVector.length > 0) {
      const { reflections } = vectorSpace.reflectAll(queryVector);
      for (const ref of reflections) {
        for (const pair of allHistory) {
          if (included.has(pair.id)) continue;
          if (pair.rootVector.length === 0) continue;
          const sim = cosineSimilarity(ref.reflected, pair.rootVector);
          if (sim > 0.5) {
            reflectionMatches.push(pair);
            included.add(pair.id);
          }
        }
      }
      if (reflectionMatches.length > 8) reflectionMatches.length = 8;
    }

    // 5. MERGE all matches
    const allFiltered = [...recencyPairs, ...chamberMatches, ...graphNeighborMatches, ...reflectionMatches];

    // 6. RANK by combined score
    const scored = allFiltered.map(pair => {
      const isChamber = chamberMatches.includes(pair) ? 0.4 : 0;
      const isGraph = graphNeighborMatches.includes(pair) ? 0.3 : 0;
      const isReflection = reflectionMatches.includes(pair) ? 0.2 : 0;
      const recencyScore = recencyPairs.includes(pair) ? 0.1 : 0;
      return { pair, score: isChamber + isGraph + isReflection + recencyScore };
    });
    scored.sort((a, b) => b.score - a.score);

    // 7. TRUNCATE to token budget
    let tokenCount = 0;
    const filteredPairs: RootPair[] = [];
    for (const { pair } of scored) {
      const pairTokens = estimateTokens(pair.query) + estimateTokens(pair.response);
      if (tokenCount + pairTokens > config.maxContextTokens && filteredPairs.length >= recencyCount) {
        break;
      }
      filteredPairs.push(pair);
      tokenCount += pairTokens;
    }

    // 8. Compute savings
    let originalTokenCount = 0;
    for (const pair of allHistory) {
      originalTokenCount += estimateTokens(pair.query) + estimateTokens(pair.response);
    }

    const tokensSaved = Math.max(0, originalTokenCount - tokenCount);
    const percentSaved = originalTokenCount > 0 ? (tokensSaved / originalTokenCount) * 100 : 0;

    return {
      filteredPairs,
      chamberMatches,
      graphNeighborMatches,
      reflectionMatches,
      originalTokenCount,
      filteredTokenCount: tokenCount,
      tokensSaved,
      percentSaved,
      retrievalBreakdown: {
        byChamber: chamberMatches.length,
        byGraph: graphNeighborMatches.length,
        byReflection: reflectionMatches.length,
        byRecency: recencyCount,
      },
    };
  }
}
