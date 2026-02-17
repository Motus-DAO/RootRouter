'use client';

import React, { useState } from 'react';
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
  const agentGraph = s.agentGraph ?? { nodes: [], edges: [] };
  const vsStats = summary.vectorSpaceStats ?? s.vectorSpaceSummary;

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
            Agent graph — nodes ({agentGraph.nodes.length})
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
            {agentGraph.nodes.map((n) => (
              <li key={n.agentId} style={{ padding: '0.25rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="holo-badge" style={{ marginRight: '0.5rem' }}>{n.agentId}</span>
                interactions: {n.totalInteractions}, avgNorm: {n.avgRootNorm.toFixed(3)}
              </li>
            ))}
            {agentGraph.nodes.length === 0 && (
              <li style={{ color: 'var(--prism-text-dim)' }}>Single-agent run — no multi-agent graph.</li>
            )}
          </ul>
        </div>
        <div
          className="holo-card-prism"
          style={{ padding: '1rem 1.2rem', position: 'relative', zIndex: 1 }}
        >
          <div style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--prism-text-muted)' }}>
            Agent graph — edges ({agentGraph.edges.length})
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
            {agentGraph.edges.map((e, i) => (
              <li key={`${e.sourceAgentId}-${e.targetAgentId}-${i}`} style={{ padding: '0.25rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {e.sourceAgentId} → {e.targetAgentId} (delegations: {e.delegationCount})
              </li>
            ))}
            {agentGraph.edges.length === 0 && (
              <li style={{ color: 'var(--prism-text-dim)' }}>No delegation edges in this run.</li>
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
