---
name: rootrouter
description: Work with the RootRouter codebase — algebraic agent infrastructure, Celo telemetry, demos, dashboard, and SDK. Use when editing RootRouter, running or changing demos (basic, swarm, benchmark), dashboard/Convex/topology, NPM package build, or Celo/Solidity telemetry.
---

# RootRouter project skill

## When to use

- Editing `src/`, `demo/`, `app/dashboard/`, or `contracts/`
- Running or modifying demos: `demo/basic.ts`, `demo/swarm.ts`, `demo/benchmark.ts`
- Dashboard: Next.js app, Convex snapshots, topology view
- Publishing or consuming the SDK as NPM package
- Celo telemetry contract or `src/celo/`

## Quick reference

| What | Where / command |
|------|------------------|
| Public API | `src/index.ts` |
| Config | `src/config.ts`, `.env` (see `.env.example`) |
| Build SDK | `npm run build` → `dist/` (uses `tsconfig.build.json`) |
| Demos | `npm run demo:basic`, `demo:swarm`, `demo:benchmark` |
| Dashboard | `npm run dashboard` (Next.js, port 3000) |
| Topology snapshots | Set `DASHBOARD_URL=http://localhost:3000`, run a demo; snapshots POST to `/api/snapshots`, stored in Convex |
| Telemetry contract | `contracts/RootRouterTelemetry.sol`; mainnet `0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab` |

## Key concepts

- **Root pair**: intent vector − execution vector per interaction; stored in `RootPairCollector`, used for chambers and routing.
- **Chambers**: Regions of root-vector space (sign patterns from PCA). Each chamber has `avgRootNorm`, `bestModel` (tier).
- **Model tiers**: `fast` (0), `balanced` (1), `powerful` (2). Router picks tier by chamber difficulty.
- **Telemetry on Celo**: `CeloTelemetry` in `src/celo/telemetry.ts`; contract exposes `getStats(agent)`, `getRecentEntries(agent, count)`. Dashboard hook `useCeloTelemetry(agentAddress)` reads from chain.
- **Snapshot for dashboard**: `router.getSnapshotForExport(runId, agentId)`; summary includes `totalCostSaved`, `topModel`, chambers, agent graph, interaction graph.

## Conventions

- TypeScript strict; main lib is CJS in `dist/`. Package has `exports` for ESM/CJS.
- Dashboard cost from Celo is **estimated** (tokens × `ESTIMATED_USD_PER_TOKEN_SAVED`) because the chain does not store cost per entry.
- For detailed architecture and math, see `README.md` and `docs/architecture.md`.
