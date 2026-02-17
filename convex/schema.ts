import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * RootRouter Convex schema.
 * - telemetryCache: optional cache of Celo on-chain telemetry per agent.
 * - runSnapshots: off-chain state from demo runs (chambers, graph, topology) for visualization.
 */

const telemetryEntryValidator = v.object({
  chamberId: v.number(),
  rootNorm: v.number(),
  modelTier: v.number(),
  tokensSaved: v.number(),
  timestamp: v.number(),
});

export default defineSchema({
  telemetryCache: defineTable({
    agentAddress: v.string(),
    entries: v.array(telemetryEntryValidator),
    lastFetchedAt: v.number(),
  }).index('by_agent', ['agentAddress']),

  runSnapshots: defineTable({
    runId: v.string(),
    agentId: v.string(),
    snapshot: v.any(),
    createdAt: v.number(),
  })
    .index('by_run', ['runId'])
    .index('by_agent', ['agentId'])
    .index('by_created', ['createdAt']),
});
