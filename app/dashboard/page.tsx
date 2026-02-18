'use client';

import React, { useState } from 'react';
import OverviewCard from '../../components/OverviewCard';
import TokensOverTimeChart from '../../components/TokensOverTimeChart';
import ChamberDistribution from '../../components/ChamberDistribution';
import ModelRoutingChart from '../../components/ModelRoutingChart';
import RecentEntriesTable from '../../components/RecentEntriesTable';
import { useCeloTelemetry } from '../../hooks/useCeloTelemetry';

const DEFAULT_AGENT = '0x64608C2d5E4685830348e9155bAB423bf905E9c9';

type ControlsBarProps = {
  agentInput: string;
  setAgentInput: (v: string) => void;
  onLoad: () => void;
  onRefresh: () => void;
  loading: boolean;
  statusMessage: string;
};

function ControlsBar({
  agentInput,
  setAgentInput,
  onLoad,
  onRefresh,
  loading,
  statusMessage,
}: ControlsBarProps) {
  return (
    <div
      className="crystal-glass-prism"
      style={{
        padding: '1rem 1.5rem',
        borderRadius: 'var(--prism-radius)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <label style={{ fontSize: '0.9rem', color: 'var(--prism-text-muted)' }}>
          Agent address
          <input
            type="text"
            value={agentInput}
            onChange={(e) => setAgentInput(e.target.value)}
            placeholder="0x..."
            style={{
              marginLeft: '0.5rem',
              padding: '0.45rem 0.75rem',
              minWidth: '260px',
              borderRadius: 'var(--prism-radius-sm)',
              border: '1px solid var(--prism-border)',
              background: 'rgba(0,0,0,0.4)',
              color: 'var(--prism-text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
            }}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onLoad}
          disabled={loading}
          style={{
            padding: '0.5rem 0.9rem',
            borderRadius: '999px',
            border: '1px solid rgba(0, 255, 255, 0.4)',
            background: 'linear-gradient(to right, rgba(0, 229, 255, 0.25), rgba(225, 68, 255, 0.2))',
            color: '#fff',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-display)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Load from Celo
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="holo-badge"
          style={{
            padding: '0.5rem 0.9rem',
            borderRadius: 'var(--prism-radius-sm)',
            border: '1px solid var(--prism-border)',
            background: 'rgba(0, 255, 204, 0.06)',
            color: 'var(--prism-text)',
            fontSize: '0.85rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Refresh
        </button>
        <span
          style={{
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--prism-text-muted)',
          }}
        >
          {statusMessage}
        </span>
      </div>
    </div>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
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
          RootRouter Dashboard
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--prism-text-muted)' }}>
          Algebraic Agent Infrastructure — Live telemetry from Celo mainnet
        </p>
      </header>
      {children}
    </main>
  );
}

export default function DashboardPage() {
  const [agentAddress, setAgentAddress] = useState(DEFAULT_AGENT);
  const [agentInput, setAgentInput] = useState(DEFAULT_AGENT);
  const { loading, error, stats, entries, estimatedCostSavedUsd, primaryModel, reload, lastLoadedCount } = useCeloTelemetry(agentAddress);

  const handleLoad = () => {
    const trimmed = agentInput.trim();
    if (trimmed) setAgentAddress(trimmed);
  };

  const statusMessage = (() => {
    if (!agentAddress) return 'Set an agent address and click Load from Celo.';
    if (loading) return `Loading from Celo for ${agentAddress}…`;
    if (error) return `Error: ${error}`;
    if (!stats && entries.length === 0) return 'No telemetry yet for this agent.';
    return `Loaded ${lastLoadedCount} entries for ${agentAddress}.`;
  })();

  const totalInteractions = stats?.interactions ?? 0;
  const totalTokensSaved = stats?.tokensSaved ?? 0;
  const avgTokensPerInteraction = totalInteractions > 0 ? totalTokensSaved / totalInteractions : 0;

  return (
    <DashboardShell>
      <ControlsBar
        agentInput={agentInput}
        setAgentInput={setAgentInput}
        onLoad={handleLoad}
        onRefresh={() => void reload()}
        loading={loading}
        statusMessage={statusMessage}
      />

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <OverviewCard
          title="Total Interactions"
          value={totalInteractions.toLocaleString()}
          subtitle="All-time calls traced"
        />
        <OverviewCard
          title="Tokens Saved"
          value={totalTokensSaved.toLocaleString()}
          subtitle="Across all routed requests"
        />
        <OverviewCard
          title="Cost saved (est.)"
          value={estimatedCostSavedUsd > 0 ? `$${estimatedCostSavedUsd.toFixed(4)}` : '—'}
          subtitle="From tokens × avg $/token (on-chain does not store cost)"
        />
        <OverviewCard
          title="Primary model"
          value={primaryModel ? `${primaryModel.label} (${primaryModel.percent.toFixed(0)}%)` : '—'}
          subtitle="Most used tier in recent window"
        />
        <OverviewCard
          title="Avg tokens / interaction"
          value={avgTokensPerInteraction.toFixed(2)}
          subtitle="Efficiency of routing"
        />
        <OverviewCard
          title="Recent entries"
          value={entries.length.toString()}
          subtitle="Window shown in charts"
        />
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1.4fr)',
          gap: '1.5rem',
          marginBottom: '1.75rem',
        }}
      >
        <TokensOverTimeChart entries={entries} />
        <ModelRoutingChart entries={entries} />
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1.7fr)',
          gap: '1.5rem',
        }}
      >
        <ChamberDistribution entries={entries} />
        <RecentEntriesTable entries={entries} />
      </section>
    </DashboardShell>
  );
}
