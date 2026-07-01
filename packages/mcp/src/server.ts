#!/usr/bin/env node
/**
 * RootRouter MCP server.
 *
 * Exposes RootRouter's context-selection engine over the Model Context Protocol so any
 * MCP client (Codex, Cursor, OpenClaw, Hermes, ...) can:
 *   - record_context: stash candidate context (file chunks, prior turns, tool output)
 *   - select_context: get back the minimal relevant slice within a token budget
 *   - select_for_spec: one-call selection from ROOTROUTER_ACTIVE_SPEC / spec path
 *   - stats: inspect store size and cumulative token savings
 *   - list_selections: read persistent audit log of past selections
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
  buildEmbeddingProviderFromEnv,
  buildSelectionFromSpec,
  indexRepo,
  listSelectionAudit,
  resolveActiveSpecPath,
  summarizeSelectionAudit,
  type ContextItem,
  type SelectionBaseline,
  type SelectionResult,
} from 'rootrouter';

function resolveStorePath(): string {
  const fromEnv = process.env.ROOTROUTER_STORE_PATH;
  if (fromEnv && fromEnv.trim()) return fromEnv;
  return path.join(os.homedir(), '.rootrouter', 'store.json');
}

function buildEngine(): ContextEngine {
  const store = new FileContextStore({
    filePath: resolveStorePath(),
    maxItems: Number(process.env.ROOTROUTER_MAX_ITEMS ?? 0) || undefined,
  });
  return new ContextEngine({
    store,
    provider: buildEmbeddingProviderFromEnv(),
    useChambers: (process.env.ROOTROUTER_USE_CHAMBERS ?? 'false').toLowerCase() === 'true',
  });
}

const engine = buildEngine();

function formatSelectionResponse(result: SelectionResult, extraHeader?: string) {
  const formatted = result.selected
    .map((item, i) => {
      const score = result.scores[item.id]?.relevance ?? 0;
      const tag = item.kind ? `[${item.kind}]` : '';
      return `--- #${i + 1} ${tag} (id=${item.id}, relevance=${score.toFixed(3)}) ---\n${item.text}`;
    })
    .join('\n\n');

  const header =
    (extraHeader ? `${extraHeader}\n` : '') +
    `Selected ${result.selected.length} item(s), ${result.tokensOut} tokens ` +
    `(saved ${result.tokensSaved} tokens, ${result.percentSaved.toFixed(1)}% vs baseline).`;

  return {
    content: [
      {
        type: 'text' as const,
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

// ─── index_repo ───
server.registerTool(
  'index_repo',
  {
    title: 'Index repository',
    description:
      'Walk a codebase once per repo revision or slice kickoff (not every turn). Builds a native RepoGraph ' +
      '(imports + directory communities) and upserts chunks into the persistent store for select_context.',
    inputSchema: {
      path: z.string().describe('Absolute or relative path to the repository root'),
      agentId: z.string().optional().describe('Agent id scope for indexed chunks (default repo)'),
    },
  },
  async ({ path: repoPath, agentId }) => {
    const result = indexRepo({ rootPath: repoPath, agentId: agentId ?? 'repo' });
    engine.record(result.items);
    await engine.save();
    const stats = engine.stats();
    return {
      content: [
        {
          type: 'text',
          text:
            `Indexed ${result.stats.chunksIndexed} chunks from ${result.stats.filesScanned} files ` +
            `(${result.stats.edgesCreated} edges, ${result.stats.communities} communities). ` +
            `Store now holds ${stats.items} item(s).`,
        },
      ],
      structuredContent: { ...result.stats, storeItems: stats.items },
    };
  }
);

// ─── select_context ───
server.registerTool(
  'select_context',
  {
    title: 'Select context',
    description:
      'Return the minimal relevant slice of recorded context for a query, fit to a token budget. ' +
      'Shape query like: slice name + acceptance criteria + module names + anchor file names ' +
      '(e.g. "Academy slice 4: lesson player progress bar, LessonPlayer.tsx, AC 3.2"). ' +
      'Use pathPrefix / excludePaths in monorepos to scope file chunks. Complements reading the spec — does not replace it.',
    inputSchema: {
      query: z.string().describe(
        'Task query: slice + acceptance criteria + module + anchor file names (not "read everything")'
      ),
      tokenBudget: z.number().int().positive().optional().describe('Max tokens of selected context (default 4000)'),
      agentId: z.string().optional().describe('Restrict to this agent\'s recorded items'),
      mmrLambda: z.number().min(0).max(1).optional().describe('Relevance vs diversity trade-off (default 0.7)'),
      baseline: z.enum(['all', 'window']).optional().describe('Savings baseline (default all)'),
      pathPrefix: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Keep file chunks under these repo-relative path prefixes (e.g. "apps/academy")'),
      excludePaths: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Drop file chunks under these prefixes (e.g. "apps/waap")'),
    },
  },
  async ({ query, tokenBudget, agentId, mmrLambda, baseline, pathPrefix, excludePaths }) => {
    const result = await engine.select(query, {
      tokenBudget: tokenBudget ?? 4000,
      agentId,
      mmrLambda,
      baseline: baseline as SelectionBaseline | undefined,
      pathPrefix,
      excludePaths,
    });
    await engine.save();

    return formatSelectionResponse(result);
  }
);

// ─── select_for_spec ───
server.registerTool(
  'select_for_spec',
  {
    title: 'Select context for active spec',
    description:
      'One-call cold-slice selection: read the active spec (specPath or ROOTROUTER_ACTIVE_SPEC / MOTUS_ACTIVE_SPEC), ' +
      'build the query from title + acceptance criteria + anchor paths, apply pathPrefix and spec-anchor boost, ' +
      'then return budgeted context. Read the spec file yourself after — this does not replace it.',
    inputSchema: {
      specPath: z
        .string()
        .optional()
        .describe('Path to spec markdown; defaults to ROOTROUTER_ACTIVE_SPEC or MOTUS_ACTIVE_SPEC env'),
      tokenBudget: z.number().int().positive().optional().describe('Max tokens of selected context (default 4000)'),
      agentId: z.string().optional().describe('Restrict to this agent\'s recorded items'),
      pathPrefix: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Override inferred path prefix from spec anchor files'),
      excludePaths: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Drop file chunks under these prefixes'),
      useInferredPathPrefix: z
        .boolean()
        .optional()
        .describe('Apply pathPrefix inferred from spec anchors (default true)'),
    },
  },
  async ({ specPath, tokenBudget, agentId, pathPrefix, excludePaths, useInferredPathPrefix }) => {
    const resolvedSpec = resolveActiveSpecPath(specPath);
    if (!resolvedSpec) {
      return {
        content: [
          {
            type: 'text',
            text:
              'No spec path: pass specPath or set ROOTROUTER_ACTIVE_SPEC (or MOTUS_ACTIVE_SPEC) in MCP env.',
          },
        ],
        isError: true,
      };
    }

    const hints = buildSelectionFromSpec(resolvedSpec);
    const applyPrefix = useInferredPathPrefix !== false;
    const effectivePrefix =
      pathPrefix ?? (applyPrefix && hints.pathPrefix ? hints.pathPrefix : undefined);

    const result = await engine.select(hints.query, {
      tokenBudget: tokenBudget ?? 4000,
      agentId,
      pathPrefix: effectivePrefix,
      excludePaths,
      specPaths: hints.specPaths,
    });
    await engine.save();

    const header =
      `Spec: ${hints.specPath}\n` +
      `Query: ${hints.query}\n` +
      (effectivePrefix ? `pathPrefix: ${effectivePrefix}\n` : '') +
      `Anchors: ${hints.specPaths.length}`;

    return {
      ...formatSelectionResponse(result, header),
      structuredContent: {
        ...formatSelectionResponse(result, header).structuredContent,
        specPath: hints.specPath,
        query: hints.query,
        pathPrefix: effectivePrefix ?? null,
        anchorPaths: hints.specPaths,
        title: hints.parsed.title,
        acceptanceCriteria: hints.parsed.acceptanceCriteria,
      },
    };
  }
);

// ─── stats ───
server.registerTool(
  'stats',
  {
    title: 'RootRouter stats',
    description:
      'Handoff and audit summary: store size, cumulative tokens saved, last selection, audit log path. ' +
      'Call at slice handoff — not every turn in the agent loop.',
    inputSchema: {},
  },
  async () => {
    const s = engine.stats();
    const audit = summarizeSelectionAudit();
    const last = listSelectionAudit({ limit: 1 })[0];
    return {
      content: [
        {
          type: 'text',
          text:
            `Items: ${s.items}\nSelections served: ${s.selections}\n` +
            `Total tokens saved: ${s.totalTokensSaved}\n` +
            `Audit log entries: ${audit.totalEntries} (${audit.logPath})\n` +
            (last
              ? `Last selection: saved ${last.tokensSaved} tokens (${last.percentSaved.toFixed(1)}%) — "${last.query.slice(0, 80)}${last.query.length > 80 ? '…' : ''}"\n`
              : '') +
            `Chambers: ${s.chambersEnabled ? (s.chambersFitted ? 'enabled, fitted' : 'enabled, not yet fitted') : 'disabled'}`,
        },
      ],
      structuredContent: {
        ...s,
        auditLogPath: audit.logPath,
        auditEntries: audit.totalEntries,
        auditTotalTokensSaved: audit.totalTokensSaved,
        lastSelection: last ?? null,
      },
    };
  }
);

// ─── list_selections ───
server.registerTool(
  'list_selections',
  {
    title: 'List selection audit',
    description:
      'Return recent select_context calls from the persistent audit log (selections.jsonl): ' +
      'query, tokens saved, agent scope, and selected chunk ids. Use for MCP usage review and slice handoff.',
    inputSchema: {
      limit: z.number().int().positive().optional().describe('Max entries to return (default 20, max 100)'),
      agentId: z.string().optional().describe('Filter to this agent scope'),
      since: z.number().int().optional().describe('Only entries at or after this Unix ms timestamp'),
    },
  },
  async ({ limit, agentId, since }) => {
    const cap = Math.min(limit ?? 20, 100);
    const entries = listSelectionAudit({ limit: cap, agentId, since });
    const summary = summarizeSelectionAudit({ agentId, since });

    const lines =
      entries.length === 0
        ? '(no selections logged yet)'
        : entries
            .map((e, i) => {
              const when = new Date(e.ts).toISOString();
              const agent = e.agentId ?? 'default';
              const q =
                e.query.length > 100 ? `${e.query.slice(0, 97)}...` : e.query;
              return (
                `${i + 1}. ${when} | agent=${agent} | saved=${e.tokensSaved} (${e.percentSaved.toFixed(1)}%) | ` +
                `out=${e.tokensOut} | ${q}`
              );
            })
            .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `Audit log: ${summary.logPath}\n` +
            `Entries: ${summary.totalEntries} | Total saved: ${summary.totalTokensSaved}\n\n` +
            lines,
        },
      ],
      structuredContent: { summary, entries },
    };
  }
);

async function main() {
  await engine.load();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we don't corrupt the stdio JSON-RPC channel.
  console.error(`[rootrouter-mcp] ready. store=${resolveStorePath()}`);
  const activeSpec = resolveActiveSpecPath();
  if (activeSpec) {
    console.error(`[rootrouter-mcp] active spec=${activeSpec}`);
  }
}

main().catch((err) => {
  console.error('[rootrouter-mcp] fatal:', err);
  process.exit(1);
});
