'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import dynamic from 'next/dynamic';

const ForceGraph2DWrapper = dynamic(() => import('../../../components/ForceGraph2D').then((m) => m.default), {
  ssr: false,
});

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

type SnapshotData = {
  runId: string;
  agentId: string;
  snapshot: {
    summary: {
      totalInteractions: number;
      totalTokensSaved: number;
      totalCostSaved: number;
      avgRootNorm: number;
      topModel?: string;
      chambers: Array<{
        id: number;
        avgRootNorm: number;
        interactionCount: number;
        bestModel: string;
      }>;
      agents: Array<{ agentId: string; interactions: number; avgRootNorm: number; primaryChambers: number[] }>;
      graphStats: { nodeCount: number; edgeCount: number; avgDegree: number };
      vectorSpaceStats: { rootDirectionsFound: number; varianceExplained: number; activeChambers: number };
    };
    agentGraph: {
      nodes: Array<{ agentId: string; totalInteractions: number; avgRootNorm: number; chamberSpecialization: Record<number, number> }>;
      edges: Array<{ sourceAgentId: string; targetAgentId: string; delegationCount: number; avgDelegationSuccess: number }>;
    };
    interactionGraph?: {
      nodes: Array<{ id: string; chamberId: number | null; rootNorm: number; agentId: string; timestamp: number; degree: number }>;
      edges: Array<{ sourceId: string; targetId: string; type: string; weight: number }>;
    };
    rootDirections?: Array<{ index: number; eigenvalue: number; varianceRatio: number }>;
    vectorSpaceSummary?: { directionsFound: number; varianceExplained: number; activeChambers: number };
  };
  createdAt: number;
};

function getCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v.trim() || fallback;
}

export default function TopologyPage() {
  const [selectedId, setSelectedId] = useState<Id<'runSnapshots'> | null>(null);
  const snapshots = useQuery(api.runSnapshots.listRunSnapshots, { limit: 30 });
  const selectedSnapshot = useQuery(
    api.runSnapshots.getRunSnapshot,
    selectedId ? { id: selectedId } : 'skip'
  );

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
      <header
        style={{
          marginBottom: '1.5rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--prism-border)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--prism-cyan)',
            letterSpacing: '-0.02em',
            marginBottom: '0.25rem',
          }}
        >
          Topology — Run snapshots
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--prism-text-muted)' }}>
          Chambers, agent graph, and vector space from demo runs. Run the demo with <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>DASHBOARD_URL=http://localhost:3000</code> to push snapshots.
        </p>
      </header>

      <section
        className="holo-card-prism"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--prism-text-muted)' }}>
          Recent snapshots
        </div>
        {snapshots === undefined ? (
          <p style={{ color: 'var(--prism-text-dim)' }}>Loading…</p>
        ) : snapshots.length === 0 ? (
          <p style={{ color: 'var(--prism-text-dim)' }}>
            No snapshots yet. Run <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>npm run demo:basic</code> with <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>DASHBOARD_URL=http://localhost:3000</code> (and dashboard running).
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {snapshots.map((s) => (
              <li key={s._id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s._id)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--prism-radius-sm)',
                    border: `1px solid ${selectedId === s._id ? 'var(--prism-cyan)' : 'var(--prism-border)'}`,
                    background: selectedId === s._id ? 'rgba(0, 255, 204, 0.12)' : 'rgba(0,0,0,0.2)',
                    color: 'var(--prism-text)',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                  }}
                >
                  {s.runId} · {new Date(s.createdAt).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedSnapshot && (selectedSnapshot as SnapshotData).snapshot && (
        <SnapshotView data={selectedSnapshot as SnapshotData} />
      )}
    </main>
  );
}

function SnapshotView({ data }: { data: SnapshotData }) {
  const s = data.snapshot;
  const summary = s.summary;
  const chambers = summary.chambers ?? [];
  const rawAgentGraph = s.agentGraph ?? { nodes: [], edges: [] };
  // Prefer agent graph nodes; fallback to summary.agents so we always show agents (e.g. from basic/benchmark single-agent runs)
  const nodesForDisplay =
    rawAgentGraph.nodes?.length > 0
      ? rawAgentGraph.nodes
      : (summary.agents ?? []).map((a) => ({
          agentId: a.agentId,
          totalInteractions: a.interactions,
          avgRootNorm: a.avgRootNorm,
          chamberSpecialization: {} as Record<number, number>,
        }));
  const edgesForDisplay = rawAgentGraph.edges ?? [];
  const interactionGraph = s.interactionGraph ?? { nodes: [], edges: [] };
  const vsStats = summary.vectorSpaceStats ?? s.vectorSpaceSummary;

  const agentGraphData = useMemo(
    () => ({
      nodes: nodesForDisplay.map((n) => ({ id: n.agentId })),
      links: edgesForDisplay.map((e) => ({ source: e.sourceAgentId, target: e.targetAgentId })),
    }),
    [nodesForDisplay, edgesForDisplay]
  );
  const interactionGraphData = useMemo(
    () => ({
      nodes: interactionGraph.nodes.map((n) => ({ id: n.id })),
      links: interactionGraph.edges.map((e) => ({ source: e.sourceId, target: e.targetId })),
    }),
    [interactionGraph.nodes, interactionGraph.edges]
  );

  const chartData = {
    labels: chambers.sort((a, b) => a.avgRootNorm - b.avgRootNorm).map((c) => `#${c.id}`),
    datasets: [
      {
        label: 'Interactions',
        data: chambers.sort((a, b) => a.avgRootNorm - b.avgRootNorm).map((c) => c.interactionCount),
        backgroundColor: [
          getCssVar('--prism-cyan', '#00ffcc'),
          getCssVar('--prism-amber', '#ffb703'),
          getCssVar('--prism-violet', '#9d4edd'),
        ].flatMap((c) => Array(Math.ceil(chambers.length / 3)).fill(c)).slice(0, chambers.length),
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <div className="holo-card-prism" style={{ padding: '0.75rem 1rem', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--prism-text-muted)' }}>Interactions</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--prism-cyan)' }}>
            {summary.totalInteractions.toLocaleString()}
          </div>
        </div>
        <div className="holo-card-prism" style={{ padding: '0.75rem 1rem', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--prism-text-muted)' }}>Tokens saved</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--prism-cyan)' }}>
            {summary.totalTokensSaved.toLocaleString()}
          </div>
        </div>
        <div className="holo-card-prism" style={{ padding: '0.75rem 1rem', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--prism-text-muted)' }}>Cost saved</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--prism-cyan)' }}>
            ${summary.totalCostSaved.toFixed(4)}
          </div>
        </div>
        <div className="holo-card-prism" style={{ padding: '0.75rem 1rem', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--prism-text-muted)' }}>Chambers</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--prism-cyan)' }}>
            {chambers.length}
          </div>
        </div>
        {summary.topModel && (
          <div className="holo-card-prism" style={{ padding: '0.75rem 1rem', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--prism-text-muted)' }}>Model used (top)</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--prism-cyan)' }}>
              {summary.topModel}
            </div>
          </div>
        )}
        {vsStats && (
          <div className="holo-card-prism" style={{ padding: '0.75rem 1rem', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--prism-text-muted)' }}>Variance explained</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--prism-cyan)' }}>
              {(vsStats.varianceExplained * 100).toFixed(1)}%
            </div>
          </div>
        )}
      </section>

      {chambers.length > 0 && (
        <div
          className="holo-card-prism"
          style={{
            padding: '1rem 1.2rem',
            height: '260px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--prism-text-muted)' }}>
            Chamber distribution (interactions per chamber)
          </div>
          <div style={{ flex: 1 }}>
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 10 } }, grid: { display: false } },
                  y: { ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
                },
              }}
            />
          </div>
        </div>
      )}

      <div
        className="holo-card-prism"
        style={{ padding: '1rem 1.2rem', position: 'relative', zIndex: 1 }}
      >
        <div style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--prism-text-muted)' }}>
          Agent graph (nodes = agents, edges = delegations)
        </div>
        <ForceGraph2DWrapper
          nodes={agentGraphData.nodes}
          links={agentGraphData.links}
          nodeLabel={(n) => n.id}
          height={340}
          nodeRelSize={agentGraphData.nodes.length <= 1 ? 14 : undefined}
        />
        {agentGraphData.nodes.length <= 1 && (
          <p
            style={{
              marginTop: '0.75rem',
              marginBottom: 0,
              fontSize: '0.8rem',
              color: 'var(--prism-text-dim)',
            }}
          >
            Este run tiene un solo agente. Para ver varios nodos y delegaciones, ejecuta el demo <strong>swarm</strong>:{' '}
            <code style={{ padding: '0.15rem 0.35rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>
              DEMO_QUICK=true npm run demo:swarm
            </code>
          </p>
        )}
      </div>

      <div
        className="holo-card-prism"
        style={{ padding: '1rem 1.2rem', position: 'relative', zIndex: 1 }}
      >
        <div style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--prism-text-muted)' }}>
          Interaction graph (nodes = interactions, edges = temporal / topic / chamber links)
        </div>
        {interactionGraphData.nodes.length === 0 && (summary.graphStats?.nodeCount ?? 0) > 0 ? (
          <div
            style={{
              height: 340,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              color: 'var(--prism-text-muted)',
              fontSize: '0.875rem',
              textAlign: 'center',
              padding: '1rem',
            }}
          >
            <p style={{ margin: 0 }}>
              This snapshot was saved before interaction graph export was added. Stats below show {summary.graphStats.nodeCount} nodes and {summary.graphStats.edgeCount} edges, but the node/edge lists are missing.
            </p>
            <p style={{ margin: 0, color: 'var(--prism-cyan)' }}>
              Re-run the demo with the dashboard running and <code style={{ padding: '0.2rem 0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>DASHBOARD_URL=http://localhost:3000</code> in your env to push a new snapshot — the new one will show this graph.
            </p>
          </div>
        ) : (
          <ForceGraph2DWrapper
            nodes={interactionGraphData.nodes}
            links={interactionGraphData.links}
            nodeLabel={(n) => n.id?.toString().slice(0, 12) ?? ''}
            height={340}
          />
        )}
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '1.5rem',
        }}
      >
        <div
          className="holo-card-prism"
          style={{ padding: '1rem 1.2rem', position: 'relative', zIndex: 1 }}
        >
          <div style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--prism-text-muted)' }}>
            Agent graph — nodes ({nodesForDisplay.length})
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
            {nodesForDisplay.map((n) => (
              <li key={n.agentId} style={{ padding: '0.35rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="holo-badge" style={{ marginRight: '0.5rem' }}>{n.agentId}</span>
                interactions: {n.totalInteractions}, avgNorm: {n.avgRootNorm.toFixed(3)}
              </li>
            ))}
            {nodesForDisplay.length === 0 && (
              <li style={{ color: 'var(--prism-text-dim)' }}>No agent data in this snapshot.</li>
            )}
          </ul>
        </div>
        <div
          className="holo-card-prism"
          style={{ padding: '1rem 1.2rem', position: 'relative', zIndex: 1 }}
        >
          <div style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--prism-text-muted)' }}>
            Agent graph — edges ({edgesForDisplay.length})
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
            {edgesForDisplay.map((e, i) => (
              <li key={`${e.sourceAgentId}-${e.targetAgentId}-${i}`} style={{ padding: '0.35rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {e.sourceAgentId} → {e.targetAgentId} (delegations: {e.delegationCount})
              </li>
            ))}
            {edgesForDisplay.length === 0 && (
              <li style={{ color: 'var(--prism-text-dim)' }}>No delegation edges (single-agent runs have no edges).</li>
            )}
          </ul>
        </div>
      </section>

      {summary.graphStats && (
        <div className="holo-card-prism" style={{ padding: '1rem 1.2rem', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--prism-text-muted)' }}>
            Interaction graph stats
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--prism-text-muted)' }}>
            Nodes: {summary.graphStats.nodeCount} · Edges: {summary.graphStats.edgeCount} · Avg degree: {summary.graphStats.avgDegree.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
