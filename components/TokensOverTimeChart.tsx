'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { TelemetryEntry } from '../hooks/useCeloTelemetry';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Props = { entries: TelemetryEntry[] };

function getCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v.trim() || fallback;
}

export default function TokensOverTimeChart({ entries }: Props) {
  const { data, options } = useMemo(() => {
    const labels: string[] = [];
    const cumulative: number[] = [];
    let acc = 0;
    entries.forEach((entry, index) => {
      acc += entry.tokensSaved;
      labels.push((index + 1).toString());
      cumulative.push(acc);
    });
    const stroke = getCssVar('--prism-cyan', '#00ffcc');
    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Cumulative tokens saved',
            data: cumulative,
            borderColor: stroke,
            backgroundColor: 'rgba(0, 255, 204, 0.12)',
            tension: 0.3,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: 'rgba(255,255,255,0.8)', font: { size: 11 } } },
          tooltip: {
            callbacks: { label: (ctx: { parsed: { y: number } }) => `${ctx.parsed.y.toLocaleString()} tokens` },
          },
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.6)', maxRotation: 0, font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
          y: {
            ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.06)' },
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
        Cumulative tokens saved
      </div>
      <div style={{ flex: 1 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
