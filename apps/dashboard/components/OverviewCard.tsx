'use client';

import React from 'react';

export type OverviewCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function OverviewCard({ title, value, subtitle }: OverviewCardProps) {
  return (
    <div
      className="holo-card-prism"
      style={{
        padding: '1rem 1.2rem',
        borderRadius: 'var(--prism-radius)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.4rem' }}>{title}</div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.45rem',
          letterSpacing: '0.05em',
          color: 'var(--prism-cyan)',
          marginBottom: subtitle ? '0.25rem' : 0,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: 'var(--prism-text-muted)' }}>{subtitle}</div>
      )}
    </div>
  );
}
