#!/usr/bin/env node
/**
 * RootRouter MCP server.
 *
 * Exposes RootRouter's context-selection engine over the Model Context Protocol so any
 * MCP client (Codex, Cursor, OpenClaw, Hermes, ...) can:
 *   - record_context: stash candidate context (file chunks, prior turns, tool output)
 *   - select_context: get back the minimal relevant slice within a token budget
 *   - stats: inspect store size and cumulative token savings
 *
 * State is persisted to a JSON file (ROOTROUTER_STORE_PATH, default ~/.rootrouter/store.json)
 * so it survives the per-session process lifecycle that MCP hosts use.
 */
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  ContextEngine,
  FileContextStore,
  ApiEmbeddingProvider,
  type ContextItem,
  type EmbeddingProvider,
  type SelectionBaseline,
} from 'rootrouter';

function resolveStorePath(): string {
  const fromEnv = process.env.ROOTROUTER_STORE_PATH;
  if (fromEnv && fromEnv.trim()) return fromEnv;
  return path.join(os.homedir(), '.rootrouter', 'store.json');
}

function buildProvider(): EmbeddingProvider | undefined {
  // Opt-in real embeddings when an API key is configured; otherwise the engine
  // falls back to its zero-dependency TF-IDF default.
  const apiKey = process.env.EMBEDDING_API_KEY;
  if (!apiKey) return undefined;
  return new ApiEmbeddingProvider({
    embeddingApiKey: apiKey,
    embeddingApiUrl: process.env.EMBEDDING_API_URL ?? 'https://api.openai.com/v1/embeddings',
    embeddingModel: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
    embeddingDimension: Number(process.env.EMBEDDING_DIMENSION ?? 128),
  });
}

function buildEngine(): ContextEngine {
  const store = new FileContextStore({
    filePath: resolveStorePath(),
    maxItems: Number(process.env.ROOTROUTER_MAX_ITEMS ?? 0) || undefined,
  });
  return new ContextEngine({
    store,
    provider: buildProvider(),
    useChambers: (process.env.ROOTROUTER_USE_CHAMBERS ?? 'false').toLowerCase() === 'true',
  });
}

const engine = buildEngine();

const server = new McpServer({
  name: 'rootrouter',
  version: '0.1.0',
});

// ─── record_context ───
server.registerTool(
  'record_context',
  {
    title: 'Record context',
    description:
      'Store candidate context items (file chunks, prior conversation turns, tool outputs, docs) ' +
      'so they can later be selected for a query. Re-recording an item with the same id updates it.',
    inputSchema: {
      items: z
        .array(
          z.object({
            id: z.string().optional().describe('Stable id; auto-generated if omitted'),
            text: z.string().describe('The context text'),
            kind: z.enum(['message', 'file', 'tool_result', 'doc']).optional(),
            agentId: z.string().optional().describe('Owning agent, used to scope retrieval'),
            metadata: z.record(z.string(), z.unknown()).optional(),
          })
        )
        .describe('Context items to record'),
    },
  },
  async ({ items }) => {
    const toRecord: ContextItem[] = items.map((it) => ({
      id: it.id ?? randomUUID(),
      text: it.text,
      kind: it.kind,
      agentId: it.agentId,
      metadata: it.metadata as Record<string, unknown> | undefined,
      timestamp: Date.now(),
    }));
    engine.record(toRecord);
    await engine.save();
    const stats = engine.stats();
    return {
      content: [
        {
          type: 'text',
          text: `Recorded ${toRecord.length} item(s). Store now holds ${stats.items} item(s).`,
        },
      ],
      structuredContent: { recorded: toRecord.length, totalItems: stats.items },
    };
  }
);

// ─── select_context ───
server.registerTool(
  'select_context',
  {
    title: 'Select context',
    description:
      'Return the minimal, most relevant slice of recorded context for a query, fit to a token ' +
      'budget. Uses query-aware similarity plus Maximal Marginal Relevance to avoid redundant ' +
      'context. Inject the returned items into your prompt instead of stuffing everything.',
    inputSchema: {
      query: z.string().describe('The query/task to select context for'),
      tokenBudget: z.number().int().positive().optional().describe('Max tokens of selected context (default 4000)'),
      agentId: z.string().optional().describe('Restrict to this agent\'s recorded items'),
      mmrLambda: z.number().min(0).max(1).optional().describe('Relevance vs diversity trade-off (default 0.7)'),
      baseline: z.enum(['all', 'window']).optional().describe('Savings baseline (default all)'),
    },
  },
  async ({ query, tokenBudget, agentId, mmrLambda, baseline }) => {
    const result = await engine.select(query, {
      tokenBudget: tokenBudget ?? 4000,
      agentId,
      mmrLambda,
      baseline: baseline as SelectionBaseline | undefined,
    });

    const formatted = result.selected
      .map((item, i) => {
        const score = result.scores[item.id]?.relevance ?? 0;
        const tag = item.kind ? `[${item.kind}]` : '';
        return `--- #${i + 1} ${tag} (id=${item.id}, relevance=${score.toFixed(3)}) ---\n${item.text}`;
      })
      .join('\n\n');

    const header =
      `Selected ${result.selected.length} item(s), ${result.tokensOut} tokens ` +
      `(saved ${result.tokensSaved} tokens, ${result.percentSaved.toFixed(1)}% vs baseline).`;

    return {
      content: [
        {
          type: 'text',
          text: result.selected.length > 0 ? `${header}\n\n${formatted}` : `${header}\n\n(no context recorded yet)`,
        },
      ],
      structuredContent: {
        selected: result.selected.map((item) => ({
          id: item.id,
          text: item.text,
          kind: item.kind ?? null,
          relevance: result.scores[item.id]?.relevance ?? 0,
        })),
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        tokensSaved: result.tokensSaved,
        percentSaved: result.percentSaved,
        reasoning: result.reasoning,
        breakdown: result.breakdown,
      },
    };
  }
);

// ─── stats ───
server.registerTool(
  'stats',
  {
    title: 'RootRouter stats',
    description: 'Report store size, number of selections served, and cumulative tokens saved.',
    inputSchema: {},
  },
  async () => {
    const s = engine.stats();
    return {
      content: [
        {
          type: 'text',
          text:
            `Items: ${s.items}\nSelections served: ${s.selections}\n` +
            `Total tokens saved: ${s.totalTokensSaved}\n` +
            `Chambers: ${s.chambersEnabled ? (s.chambersFitted ? 'enabled, fitted' : 'enabled, not yet fitted') : 'disabled'}`,
        },
      ],
      structuredContent: s,
    };
  }
);

async function main() {
  await engine.load();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we don't corrupt the stdio JSON-RPC channel.
  console.error(`[rootrouter-mcp] ready. store=${resolveStorePath()}`);
}

main().catch((err) => {
  console.error('[rootrouter-mcp] fatal:', err);
  process.exit(1);
});
