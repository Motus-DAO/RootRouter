'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { TelemetryEntry } from '../hooks/useCeloTelemetry';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Props = { entries: TelemetryEntry[] };

function getCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v.trim() || fallback;
}

type ChamberAgg = { count: number; totalRootNorm: number };

export default function ChamberDistribution({ entries }: Props) {
  const { data, options } = useMemo(() => {
    const map = new Map<number, ChamberAgg>();
    const rootNorms: number[] = [];
    entries.forEach((e) => {
      const cur = map.get(e.chamberId) ?? { count: 0, totalRootNorm: 0 };
      cur.count += 1;
      cur.totalRootNorm += e.rootNorm;
      map.set(e.chamberId, cur);
      rootNorms.push(e.rootNorm);
    });
    rootNorms.sort((a, b) => a - b);
    const p = (x: number) =>
      rootNorms.length === 0
        ? 0
        : rootNorms[Math.min(rootNorms.length - 1, Math.max(0, Math.floor((x / 100) * rootNorms.length)))];
    const p33 = p(33);
    const p66 = p(66);
    const easy = getCssVar('--prism-cyan', '#00ffcc');
    const medium = getCssVar('--prism-amber', '#ffb703');
    const hard = getCssVar('--prism-violet', '#9d4edd');
    const labels: string[] = [];
    const counts: number[] = [];
    const avgs: number[] = [];
    const colors: string[] = [];
    Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([chamberId, agg]) => {
        const avg = agg.totalRootNorm / agg.count;
        labels.push(`#${chamberId}`);
        counts.push(agg.count);
        avgs.push(avg);
        colors.push(avg <= p33 ? easy : avg <= p66 ? medium : hard);
      });
    return {
      data: {
        labels,
        datasets: [{ type: 'bar' as const, label: 'Entries', data: counts, backgroundColor: colors }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: 'rgba(255,255,255,0.8)', font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx: { dataIndex: number }) =>
                `Entries: ${counts[ctx.dataIndex]}, avg rootNorm: ${avgs[ctx.dataIndex].toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 10 } },
            grid: { display: false },
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
        Chamber distribution (difficulty & load)
      </div>
      <div style={{ flex: 1 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
