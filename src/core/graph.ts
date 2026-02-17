import {
  InteractionNode, InteractionEdge, InteractionEdgeType,
  RootPair, GraphSpectrum, Vector,
} from '../types';
import { cosineSimilarity, norm } from '../math/vectors';

/**
 * InteractionGraph: Knowledge graph of agent interactions.
 * Nodes = interactions, edges = relationships (temporal, topic, chamber, agent, delegation).
 * Enables context retrieval beyond flat vector similarity via graph traversal.
 */
export class InteractionGraph {
  private nodes: Map<string, InteractionNode> = new Map();
  private insertionOrder: string[] = [];

  addNode(rootPair: RootPair): InteractionNode {
    const node: InteractionNode = {
      id: rootPair.id,
      rootPairId: rootPair.id,
      chamberId: rootPair.chamberId,
      rootNorm: rootPair.rootNorm,
      agentId: rootPair.agentId,
      timestamp: rootPair.timestamp,
      edges: new Map(),
      degree: 0,
      localClusteringCoeff: 0,
    };
    this.nodes.set(node.id, node);
    this.insertionOrder.push(node.id);
    rootPair.graphNodeId = node.id;
    return node;
  }

  addEdge(sourceId: string, targetId: string, type: InteractionEdgeType, weight: number): void {
    const source = this.nodes.get(sourceId);
    const target = this.nodes.get(targetId);
    if (!source || !target || sourceId === targetId) return;

    const edgeKey = `${sourceId}-${targetId}`;
    const reverseKey = `${targetId}-${sourceId}`;

    if (source.edges.has(targetId)) return; // already connected

    const edge: InteractionEdge = { sourceId, targetId, type, weight };
    const reverseEdge: InteractionEdge = { sourceId: targetId, targetId: sourceId, type, weight };

    source.edges.set(targetId, edge);
    target.edges.set(sourceId, reverseEdge);
    source.degree = source.edges.size;
    target.degree = target.edges.size;
  }

  detectEdges(
    nodeId: string,
    config: {
      topicThreshold: number;
      maxRecentToCheck: number;
      reflectedVectors?: { nodeId: string; reflected: Vector }[];
    },
    allPairs: Map<string, RootPair>
  ): InteractionEdge[] {
    const newEdges: InteractionEdge[] = [];
    const node = this.nodes.get(nodeId);
    if (!node) return newEdges;

    const currentPair = allPairs.get(nodeId);
    if (!currentPair) return newEdges;

    // Get recent nodes to compare against
    const recentIds = this.insertionOrder
      .slice(-config.maxRecentToCheck - 1)
      .filter(id => id !== nodeId);

    for (const otherId of recentIds) {
      const other = this.nodes.get(otherId);
      const otherPair = allPairs.get(otherId);
      if (!other || !otherPair) continue;

      // Temporal: previous insertion
      if (this.insertionOrder.indexOf(otherId) === this.insertionOrder.indexOf(nodeId) - 1) {
        this.addEdge(nodeId, otherId, 'temporal', 0.8);
        newEdges.push({ sourceId: nodeId, targetId: otherId, type: 'temporal', weight: 0.8 });
      }

      // Topic similarity
      if (currentPair.rootVector.length > 0 && otherPair.rootVector.length > 0) {
        const sim = cosineSimilarity(currentPair.rootVector, otherPair.rootVector);
        if (sim > config.topicThreshold) {
          this.addEdge(nodeId, otherId, 'topic_similarity', sim);
          newEdges.push({ sourceId: nodeId, targetId: otherId, type: 'topic_similarity', weight: sim });
        }
      }

      // Same agent
      if (currentPair.agentId === otherPair.agentId && otherId === this.lastByAgent(currentPair.agentId, nodeId)) {
        this.addEdge(nodeId, otherId, 'same_agent', 0.6);
        newEdges.push({ sourceId: nodeId, targetId: otherId, type: 'same_agent', weight: 0.6 });
      }

      // Same chamber
      if (currentPair.chamberId !== null && currentPair.chamberId === otherPair.chamberId) {
        this.addEdge(nodeId, otherId, 'same_chamber', 0.5);
        newEdges.push({ sourceId: nodeId, targetId: otherId, type: 'same_chamber', weight: 0.5 });
      }
    }

    return newEdges;
  }

  getNode(id: string): InteractionNode | undefined {
    return this.nodes.get(id);
  }

  getNeighborhood(nodeId: string, hops: number): { nodeId: string; distance: number; pathWeight: number }[] {
    const result: Map<string, { distance: number; pathWeight: number }> = new Map();
    const visited = new Set<string>();
    const queue: { id: string; distance: number; weight: number }[] = [{ id: nodeId, distance: 0, weight: 1.0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.distance > 0) {
        const existing = result.get(current.id);
        if (!existing || current.weight > existing.pathWeight) {
          result.set(current.id, { distance: current.distance, pathWeight: current.weight });
        }
      }
      if (current.distance >= hops) continue;

      const node = this.nodes.get(current.id);
      if (!node) continue;

      for (const [neighborId, edge] of node.edges) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({
            id: neighborId,
            distance: current.distance + 1,
            weight: current.weight * edge.weight,
          });
        }
      }
    }

    return Array.from(result.entries())
      .map(([nodeId, info]) => ({ nodeId, ...info }))
      .sort((a, b) => b.pathWeight - a.pathWeight);
  }

  getNeighborsByType(nodeId: string, type: InteractionEdgeType): InteractionNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    const result: InteractionNode[] = [];
    for (const [neighborId, edge] of node.edges) {
      if (edge.type === type) {
        const neighbor = this.nodes.get(neighborId);
        if (neighbor) result.push(neighbor);
      }
    }
    return result;
  }

  findRelevantContext(params: {
    queryVector: Vector;
    allPairs: RootPair[];
    maxResults: number;
    hops: number;
  }): RootPair[] {
    if (params.allPairs.length === 0) return [];

    // Find seed nodes: top 3 most similar by cosine
    const scored = params.allPairs
      .filter(p => p.graphNodeId && p.rootVector.length > 0)
      .map(p => ({
        pair: p,
        sim: cosineSimilarity(params.queryVector, p.rootVector),
      }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 3);

    const resultIds = new Set<string>();
    const resultPairs: Map<string, { pair: RootPair; score: number }> = new Map();

    // BFS from each seed
    for (const seed of scored) {
      if (!seed.pair.graphNodeId) continue;
      const neighbors = this.getNeighborhood(seed.pair.graphNodeId, params.hops);
      for (const n of neighbors) {
        if (!resultIds.has(n.nodeId)) {
          resultIds.add(n.nodeId);
          const pair = params.allPairs.find(p => p.graphNodeId === n.nodeId);
          if (pair) {
            const topicSim = pair.rootVector.length > 0
              ? cosineSimilarity(params.queryVector, pair.rootVector)
              : 0;
            resultPairs.set(n.nodeId, {
              pair,
              score: topicSim * 0.6 + n.pathWeight * 0.4,
            });
          }
        }
      }
    }

    return Array.from(resultPairs.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, params.maxResults)
      .map(r => r.pair);
  }

  getStats(): {
    nodeCount: number;
    edgeCount: number;
    avgDegree: number;
    edgeTypeCounts: Record<string, number>;
  } {
    let totalEdges = 0;
    const typeCounts: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      for (const edge of node.edges.values()) {
        totalEdges++;
        typeCounts[edge.type] = (typeCounts[edge.type] ?? 0) + 1;
      }
    }
    totalEdges = Math.floor(totalEdges / 2); // each edge counted twice
    for (const key of Object.keys(typeCounts)) {
      typeCounts[key] = Math.floor(typeCounts[key] / 2);
    }
    const nodeCount = this.nodes.size;
    return {
      nodeCount,
      edgeCount: totalEdges,
      avgDegree: nodeCount > 0 ? (totalEdges * 2) / nodeCount : 0,
      edgeTypeCounts: typeCounts as Record<string, number>,
    };
  }

  getSpectrum(topK: number = 3): GraphSpectrum {
    const nodeIds = this.insertionOrder.slice(-200);
    const n = nodeIds.length;
    if (n < 2) return { eigenvalues: [], spectralGap: 0, algebraicConnectivity: 0 };

    const idxMap = new Map<string, number>();
    nodeIds.forEach((id, i) => idxMap.set(id, i));

    // Build adjacency matrix
    const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const id of nodeIds) {
      const node = this.nodes.get(id);
      if (!node) continue;
      const i = idxMap.get(id)!;
      for (const [neighborId, edge] of node.edges) {
        const j = idxMap.get(neighborId);
        if (j !== undefined) {
          A[i][j] = edge.weight;
          A[j][i] = edge.weight;
        }
      }
    }

    // Power iteration for top eigenvalues
    const eigenvalues: number[] = [];
    const M = A.map(row => [...row]);

    for (let k = 0; k < Math.min(topK, n); k++) {
      let v = new Array(n);
      for (let i = 0; i < n; i++) v[i] = Math.sin((k + 1) * (i + 1) * 0.7);
      let mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      if (mag > 0) v = v.map(x => x / mag);

      for (let iter = 0; iter < 100; iter++) {
        const Mv = new Array(n).fill(0);
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) Mv[i] += M[i][j] * v[j];
        mag = Math.sqrt(Mv.reduce((s, x) => s + x * x, 0));
        if (mag < 1e-10) break;
        const vNew = Mv.map(x => x / mag);
        let diff = 0;
        for (let i = 0; i < n; i++) diff += (vNew[i] - v[i]) ** 2;
        v = vNew;
        if (diff < 1e-10) break;
      }

      const Mv = new Array(n).fill(0);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) Mv[i] += M[i][j] * v[j];
      const eigenvalue = v.reduce((s, x, i) => s + x * Mv[i], 0);
      eigenvalues.push(eigenvalue);

      // Deflate
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) M[i][j] -= eigenvalue * v[i] * v[j];
    }

    return {
      eigenvalues,
      spectralGap: eigenvalues.length >= 2 ? eigenvalues[0] - eigenvalues[1] : 0,
      algebraicConnectivity: eigenvalues.length >= 2 ? eigenvalues[eigenvalues.length - 1] : 0,
    };
  }

  private lastByAgent(agentId: string, excludeId: string): string | null {
    for (let i = this.insertionOrder.length - 1; i >= 0; i--) {
      const id = this.insertionOrder[i];
      if (id === excludeId) continue;
      const node = this.nodes.get(id);
      if (node && node.agentId === agentId) return id;
    }
    return null;
  }
}
