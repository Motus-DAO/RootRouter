'use client';

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d').then((mod) => mod.default), {
  ssr: false,
});

type GraphNode = { id: string; [k: string]: unknown };

type Props = {
  nodes: Array<{ id: string } & Record<string, unknown>>;
  links: Array<{ source: string; target: string }>;
  nodeLabel?: (node: GraphNode) => string;
  height?: number;
  /** Larger value = bigger nodes. Use when there are few nodes (e.g. 1) so the node is visible. */
  nodeRelSize?: number;
};

export default function ForceGraph2DWrapper({ nodes, links, nodeLabel, height = 360, nodeRelSize }: Props) {
  const [width, setWidth] = useState(620);

  useEffect(() => {
    const updateWidth = () =>
      setWidth(Math.min(680, typeof document !== 'undefined' ? document.documentElement.clientWidth - 80 : 620));
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n, id: n.id })),
      links: links.map((l) => ({ source: l.source, target: l.target })),
    }),
    [nodes, links]
  );

  if (nodes.length === 0 && links.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--prism-text-dim)',
          fontSize: '0.875rem',
        }}
      >
        No nodes to display
      </div>
    );
  }

  const relSize = nodeRelSize ?? (nodes.length <= 2 ? 10 : 4);
  return (
    <ForceGraph2D
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="rgba(26, 26, 36, 0.6)"
      nodeRelSize={relSize}
      nodeColor={() => getCssVar('--prism-cyan', '#00ffcc')}
      nodeLabel={(nodeLabel ?? ((n: { id?: string | number }) => String(n?.id ?? ''))) as (n: unknown) => string}
      linkColor={() => 'rgba(0, 255, 204, 0.35)'}
      linkWidth={1}
    />
  );
}

function getCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v.trim() || fallback;
}
