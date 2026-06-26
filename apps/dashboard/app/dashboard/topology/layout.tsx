import React from 'react';

// Force dynamic rendering so Convex useQuery runs with provider (no static prerender)
export const dynamic = 'force-dynamic';

export default function TopologyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
