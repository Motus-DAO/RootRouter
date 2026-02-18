'use client';

import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const ForceGraph2DWrapper = dynamic(() => import('./ForceGraph2D').then((m) => m.default), { ssr: false });

type SnapshotDoc = {
  _id: Id<'runSnapshots'>;
  runId: string;
  agentId: string;
  createdAt: number;
};

type FullSnapshot = {
  runId: string;
  agentId: string;
  snapshot: {
    summary: {
      chambers: Array<{ id: number; avgRootNorm: number; interactionCount: number; bestModel: string }>;
      agents: Array<{ agentId: string; interactions: number; avgRootNorm: number; primaryChambers: number[] }>;
      graphStats?: { nodeCount: number; edgeCount: number; avgDegree: number };
    };
    agentGraph: {
      nodes: Array<{ agentId: string; totalInteractions: number; avgRootNorm: number; chamberSpecialization?: Record<number, number> }>;
      edges: Array<{ sourceAgentId: string; targetAgentId: string; delegationCount: number; avgDelegationSuccess?: number }>;
    };
    interactionGraph?: {
      nodes: Array<{ id: string }>;
      edges: Array<{ sourceId: string; targetId: string }>;
    };
  };
  createdAt: number;
};


export default function HeroSnapshotGraphs() {
  const list = useQuery(api.runSnapshots.listRunSnapshots, { limit: 1 }) as SnapshotDoc[] | undefined;
  const snapshotId = list?.[0]?._id ?? null;
  const fullSnapshot = useQuery(
    api.runSnapshots.getRunSnapshot,
    snapshotId ? { id: snapshotId } : 'skip'
  ) as FullSnapshot | null | undefined;

  const { graphData, runId, createdAt } = useMemo(() => {
    if (!fullSnapshot?.snapshot) {
      return { graphData: null, runId: null, createdAt: null as number | null };
    }
    const s = fullSnapshot.snapshot;
    const summary = s.summary;
    const rawAgentGraph = s.agentGraph ?? { nodes: [], edges: [] };
    const nodesForDisplay =
      rawAgentGraph.nodes?.length > 0
        ? rawAgentGraph.nodes
        : (summary?.agents ?? []).map((a) => ({
            agentId: a.agentId,
            totalInteractions: a.interactions,
            avgRootNorm: a.avgRootNorm,
            chamberSpecialization: {} as Record<number, number>,
          }));
    const edgesForDisplay = rawAgentGraph.edges ?? [];
    const interactionGraph = s.interactionGraph ?? { nodes: [], edges: [] };

    const agentGraphData = {
      nodes: nodesForDisplay.map((n) => ({ id: n.agentId })),
      links: edgesForDisplay.map((e) => ({ source: e.sourceAgentId, target: e.targetAgentId })),
    };
    const interactionGraphData = {
      nodes: interactionGraph.nodes.map((n) => ({ id: n.id })),
      links: interactionGraph.edges.map((e) => ({ source: e.sourceId, target: e.targetId })),
    };
    const hasInteraction = interactionGraphData.nodes.length > 0 || interactionGraphData.links.length > 0;
    const graphData = hasInteraction ? interactionGraphData : agentGraphData;

    return {
      graphData,
      runId: fullSnapshot.runId,
      createdAt: fullSnapshot.createdAt,
    };
  }, [fullSnapshot]);

  if (list === undefined || (snapshotId && fullSnapshot === undefined)) {
    return (
      <div
        className="crystal-glass-prism"
        style={{
          padding: '2rem',
          borderRadius: 'var(--prism-radius)',
          minHeight: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--prism-text-muted)',
          fontSize: '1rem',
        }}
      >
        Loading snapshot…
      </div>
    );
  }

  if (!fullSnapshot?.snapshot || !runId) {
    return (
      <div
        className="crystal-glass-prism"
        style={{
          padding: '1rem',
          borderRadius: 'var(--prism-radius)',
          overflow: 'hidden',
          maxWidth: '100%',
        }}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: 480, margin: '0 auto' }}>
          <Image
            src="/2-600-cells-smaller.png"
            alt="Interaction space: root structure and chambers"
            width={480}
            height={320}
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'var(--prism-radius-sm)' }}
          />
        </div>
        <p style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.95rem', color: 'var(--prism-text-dim)', textAlign: 'center' }}>
          Run <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>npm run demo:swarm</code> with{' '}
          <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>DASHBOARD_URL=http://localhost:3000</code> to see live graphs here.
        </p>
      </div>
    );
  }

  const hasGraph = graphData && (graphData.nodes.length > 0 || graphData.links.length > 0);

  return (
    <div
      className="crystal-glass-prism"
      style={{
        padding: '1rem',
        borderRadius: 'var(--prism-radius)',
        position: 'relative',
        zIndex: 1,
        maxWidth: '100%',
      }}
    >
      {hasGraph ? (
        <ForceGraph2DWrapper
          nodes={graphData!.nodes}
          links={graphData!.links}
          nodeLabel={(n) => (n.id?.toString().slice(0, 12) ?? '')}
          height={320}
          nodeRelSize={graphData!.nodes.length <= 2 ? 10 : undefined}
        />
      ) : (
        <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--prism-text-dim)', fontSize: '0.8rem' }}>
          No graph data
        </div>
      )}
      <p
        style={{
          marginTop: '0.5rem',
          marginBottom: 0,
          fontSize: '0.9rem',
          color: 'var(--prism-text-dim)',
          fontFamily: 'var(--font-mono)',
          textAlign: 'center',
        }}
      >
        {runId} · {new Date(createdAt!).toLocaleString()}
      </p>
      <p
        style={{
          marginTop: '0.25rem',
          marginBottom: 0,
          fontSize: '0.85rem',
          color: 'var(--prism-text-dim)',
          textAlign: 'center',
          opacity: 0.85,
        }}
      >
        Arrastra nodos o el fondo para mover
      </p>
    </div>
  );
}
