import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const telemetryEntryValidator = v.object({
  chamberId: v.number(),
  rootNorm: v.number(),
  modelTier: v.number(),
  tokensSaved: v.number(),
  timestamp: v.number(),
});

/** Save or replace cached telemetry for an agent (e.g. after fetching from Celo). */
export const saveTelemetryCache = mutation({
  args: {
    agentAddress: v.string(),
    entries: v.array(telemetryEntryValidator),
  },
  returns: v.id('telemetryCache'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('telemetryCache')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        entries: args.entries,
        lastFetchedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert('telemetryCache', {
      agentAddress: args.agentAddress,
      entries: args.entries,
      lastFetchedAt: now,
    });
  },
});

/** Get cached telemetry for an agent (optional fallback for dashboard). */
export const getTelemetryCache = query({
  args: { agentAddress: v.string() },
  returns: v.union(
    v.object({
      entries: v.array(telemetryEntryValidator),
      lastFetchedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('telemetryCache')
      .withIndex('by_agent', (q) => q.eq('agentAddress', args.agentAddress))
      .first();
    if (!row) return null;
    return { entries: row.entries, lastFetchedAt: row.lastFetchedAt };
  },
});
