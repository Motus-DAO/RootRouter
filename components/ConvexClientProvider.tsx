'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';

function isAbsoluteUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Convex client requires .convex.cloud (deployment); .convex.site is for HTTP Actions only
function toConvexDeploymentUrl(url: string): string {
  return url.replace(/\.convex\.site\/?$/i, '.convex.cloud');
}
const rawUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
const convexUrl = rawUrl && isAbsoluteUrl(rawUrl) ? toConvexDeploymentUrl(rawUrl) : undefined;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <>{children}</>;
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
