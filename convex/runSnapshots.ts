import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/** Save a run snapshot (chambers, graph, topology) for later visualization. */
export const saveRunSnapshot = mutation({
  args: {
    runId: v.string(),
    agentId: v.string(),
    snapshot: v.any(),
  },
  returns: v.id('runSnapshots'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('runSnapshots', {
      runId: args.runId,
      agentId: args.agentId,
      snapshot: args.snapshot,
      createdAt: Date.now(),
    });
  },
});

/** List recent run snapshots for an agent (for nodes/graph/topo views). */
export const listRunSnapshots = query({
  args: {
    agentId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('runSnapshots'),
      runId: v.string(),
      agentId: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    let docs;
    if (args.agentId) {
      const agentId = args.agentId;
      docs = await ctx.db
        .query('runSnapshots')
        .withIndex('by_agent', (q) => q.eq('agentId', agentId))
        .collect();
      docs.sort((a, b) => b.createdAt - a.createdAt);
      docs = docs.slice(0, limit);
    } else {
      docs = await ctx.db.query('runSnapshots').order('desc').take(limit);
    }
    return docs.map((d) => ({
      _id: d._id,
      runId: d.runId,
      agentId: d.agentId,
      createdAt: d.createdAt,
    }));
  },
});

/** Get a single run snapshot by id (for visualization). */
export const getRunSnapshot = query({
  args: { id: v.id('runSnapshots') },
  returns: v.union(
    v.object({
      runId: v.string(),
      agentId: v.string(),
      snapshot: v.any(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    return {
      runId: doc.runId,
      agentId: doc.agentId,
      snapshot: doc.snapshot,
      createdAt: doc.createdAt,
    };
  },
});
