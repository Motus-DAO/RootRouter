'use client';

import React, { useMemo } from 'react';
import type { TelemetryEntry } from '../hooks/useCeloTelemetry';

type Props = { entries: TelemetryEntry[] };

function modelTierLabel(tier: number): string {
  if (tier === 0) return 'Fast';
  if (tier === 1) return 'Balanced';
  if (tier === 2) return 'Powerful';
  return `Tier ${tier}`;
}

export default function RecentEntriesTable({ entries }: Props) {
  const rows = useMemo(
    () =>
      [...entries]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20),
    [entries]
  );

  return (
    <div
      className="holo-card-prism"
      style={{
        padding: '1rem 1.2rem',
        borderRadius: 'var(--prism-radius)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--prism-text-muted)' }}>
        Recent routed entries
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.75rem',
          }}
        >
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--prism-text-muted)', borderBottom: '1px solid var(--prism-border)' }}>
              <th style={{ padding: '0.35rem 0.4rem' }}>Time</th>
              <th style={{ padding: '0.35rem 0.4rem' }}>Chamber</th>
              <th style={{ padding: '0.35rem 0.4rem' }}>Model</th>
              <th style={{ padding: '0.35rem 0.4rem' }}>rootNorm</th>
              <th style={{ padding: '0.35rem 0.4rem' }}>Tokens saved</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, i) => (
              <tr
                key={`${entry.chamberId}-${entry.timestamp}-${i}`}
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <td style={{ padding: '0.3rem 0.4rem', whiteSpace: 'nowrap' }}>
                  {new Date(entry.timestamp * 1000).toLocaleString()}
                </td>
                <td style={{ padding: '0.3rem 0.4rem', whiteSpace: 'nowrap' }}>
                  <span className="holo-badge">#{entry.chamberId}</span>
                </td>
                <td style={{ padding: '0.3rem 0.4rem' }}>{modelTierLabel(entry.modelTier)}</td>
                <td style={{ padding: '0.3rem 0.4rem' }}>{entry.rootNorm.toFixed(2)}</td>
                <td style={{ padding: '0.3rem 0.4rem' }}>{entry.tokensSaved.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '0.6rem 0.4rem', color: 'var(--prism-text-muted)' }}>
                  No entries yet for this agent.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
