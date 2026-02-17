import { AgentNode, AgentEdge, RootPair } from '../types';

/**
 * AgentTopologyGraph tracks relationships between agents in a swarm.
 * Nodes = agents, edges = delegation/collaboration patterns with performance weights.
 */
export class AgentTopologyGraph {
  private agents: Map<string, AgentNode> = new Map();

  registerAgent(agentId: string): AgentNode {
    if (this.agents.has(agentId)) return this.agents.get(agentId)!;
    const node: AgentNode = {
      agentId,
      totalInteractions: 0,
      avgRootNorm: 0,
      chamberSpecialization: {},
      edges: new Map(),
    };
    this.agents.set(agentId, node);
    return node;
  }

  recordInteraction(agentId: string, rootPair: RootPair): void {
    const agent = this.registerAgent(agentId);
    agent.totalInteractions++;
    // Running average of root norm
    const n = agent.totalInteractions;
    agent.avgRootNorm = agent.avgRootNorm * ((n - 1) / n) + rootPair.rootNorm / n;

    // Track chamber specialization
    if (rootPair.chamberId !== null) {
      agent.chamberSpecialization[rootPair.chamberId] =
        (agent.chamberSpecialization[rootPair.chamberId] ?? 0) + 1;
    }
  }

  recordDelegation(fromAgentId: string, toAgentId: string, rootPair: RootPair): void {
    this.registerAgent(fromAgentId);
    this.registerAgent(toAgentId);

    const from = this.agents.get(fromAgentId)!;
    let edge = from.edges.get(toAgentId);
    if (!edge) {
      edge = {
        sourceAgentId: fromAgentId,
        targetAgentId: toAgentId,
        delegationCount: 0,
        avgDelegationSuccess: 0,
        chamberFlow: {},
      };
      from.edges.set(toAgentId, edge);
    }
    edge.delegationCount++;
    const n = edge.delegationCount;
    edge.avgDelegationSuccess = edge.avgDelegationSuccess * ((n - 1) / n) + rootPair.rootNorm / n;

    if (rootPair.chamberId !== null) {
      edge.chamberFlow[rootPair.chamberId] = (edge.chamberFlow[rootPair.chamberId] ?? 0) + 1;
    }
  }

  getBestAgentForChamber(chamberId: number): { agentId: string; avgNorm: number } | null {
    let best: { agentId: string; avgNorm: number } | null = null;

    for (const agent of this.agents.values()) {
      const count = agent.chamberSpecialization[chamberId] ?? 0;
      if (count < 2) continue; // need at least 2 interactions to judge

      // Compute chamber-specific avg norm (approximate with overall avg weighted by specialization)
      const specializationRatio = count / agent.totalInteractions;
      const score = agent.avgRootNorm * (1 - specializationRatio * 0.3); // bonus for specialization

      if (!best || score < best.avgNorm) {
        best = { agentId: agent.agentId, avgNorm: score };
      }
    }

    return best;
  }

  getAgentProfile(agentId: string): AgentNode | undefined {
    return this.agents.get(agentId);
  }

  getAgentRanking(): { agentId: string; avgNorm: number; interactions: number }[] {
    return Array.from(this.agents.values())
      .map(a => ({ agentId: a.agentId, avgNorm: a.avgRootNorm, interactions: a.totalInteractions }))
      .sort((a, b) => a.avgNorm - b.avgNorm);
  }

  assignTasks(chamberIds: number[]): { chamberId: number; agentId: string; confidence: number }[] {
    return chamberIds.map(chamberId => {
      const best = this.getBestAgentForChamber(chamberId);
      if (best) {
        return { chamberId, agentId: best.agentId, confidence: 0.8 };
      }
      // Fallback: assign to agent with most interactions
      const ranking = this.getAgentRanking();
      if (ranking.length > 0) {
        return { chamberId, agentId: ranking[0].agentId, confidence: 0.3 };
      }
      return { chamberId, agentId: 'default', confidence: 0.1 };
    });
  }

  getAllAgents(): AgentNode[] {
    return Array.from(this.agents.values());
  }

  getSummary(): { agentCount: number; totalDelegations: number; avgSpecialization: number } {
    let totalDelegations = 0;
    let totalSpecializations = 0;
    for (const agent of this.agents.values()) {
      for (const edge of agent.edges.values()) totalDelegations += edge.delegationCount;
      const chamberCount = Object.keys(agent.chamberSpecialization).length;
      totalSpecializations += chamberCount > 0 ? 1 / chamberCount : 0; // higher = more specialized
    }
    return {
      agentCount: this.agents.size,
      totalDelegations,
      avgSpecialization: this.agents.size > 0 ? totalSpecializations / this.agents.size : 0,
    };
  }

  /** Serializable export for dashboard/Convex (nodes + edges as plain arrays). */
  exportForSnapshot(): {
    nodes: Array<{ agentId: string; totalInteractions: number; avgRootNorm: number; chamberSpecialization: Record<number, number> }>;
    edges: Array<{ sourceAgentId: string; targetAgentId: string; delegationCount: number; avgDelegationSuccess: number; chamberFlow: Record<number, number> }>;
  } {
    const nodes = Array.from(this.agents.values()).map((a) => ({
      agentId: a.agentId,
      totalInteractions: a.totalInteractions,
      avgRootNorm: a.avgRootNorm,
      chamberSpecialization: { ...a.chamberSpecialization },
    }));
    const edgeSet = new Set<string>();
    const edges: Array<{ sourceAgentId: string; targetAgentId: string; delegationCount: number; avgDelegationSuccess: number; chamberFlow: Record<number, number> }> = [];
    for (const agent of this.agents.values()) {
      for (const edge of agent.edges.values()) {
        const key = [edge.sourceAgentId, edge.targetAgentId].sort().join('|');
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({
          sourceAgentId: edge.sourceAgentId,
          targetAgentId: edge.targetAgentId,
          delegationCount: edge.delegationCount,
          avgDelegationSuccess: edge.avgDelegationSuccess,
          chamberFlow: { ...edge.chamberFlow },
        });
      }
    }
    return { nodes, edges };
  }
}
