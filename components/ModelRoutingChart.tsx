'use client';

import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { TelemetryEntry } from '../hooks/useCeloTelemetry';

ChartJS.register(ArcElement, Tooltip, Legend);

type Props = { entries: TelemetryEntry[] };

function getCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v.trim() || fallback;
}

export default function ModelRoutingChart({ entries }: Props) {
  const { data, options } = useMemo(() => {
    const counts = [0, 0, 0];
    entries.forEach((e) => {
      if (e.modelTier >= 0 && e.modelTier <= 2) counts[e.modelTier] += 1;
    });
    const colors = [
      getCssVar('--prism-cyan', '#00ffcc'),
      getCssVar('--prism-amber', '#ffb703'),
      getCssVar('--prism-violet', '#9d4edd'),
    ];
    return {
      data: {
        labels: ['Fast', 'Balanced', 'Powerful'],
        datasets: [
          {
            data: counts,
            backgroundColor: colors,
            borderColor: 'rgba(10,10,20,1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: { color: 'rgba(255,255,255,0.8)', font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx: { label?: string; parsed?: number }) =>
                `${ctx.label ?? ''}: ${Number(ctx.parsed ?? 0).toLocaleString()} entries`,
            },
          },
        },
      },
    };
  }, [entries]);

  return (
    <div
      className="holo-card-prism"
      style={{
        padding: '1rem 1.2rem',
        borderRadius: 'var(--prism-radius)',
        height: '260px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--prism-text-muted)' }}>
        Model tier distribution
      </div>
      <div style={{ flex: 1 }}>
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
