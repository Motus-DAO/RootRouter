"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Convex client requires .convex.cloud (deployment); .convex.site is for HTTP Actions only
function toConvexDeploymentUrl(url: string): string {
  return url.replace(/\.convex\.site\/?$/i, ".convex.cloud");
}
const rawUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim() ?? "";
const convex = new ConvexReactClient(toConvexDeploymentUrl(rawUrl));

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}
