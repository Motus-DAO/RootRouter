#!/usr/bin/env node
/**
 * RootRouter CLI
 *
 *   rootrouter index <path> [--store <file>] [--agent <id>]
 *   rootrouter init cursor|codex [--store <file>]
 *   rootrouter snapshot [--store <file>] [--dashboard <url>]
 */
import * as path from 'path';
import { indexRepo } from '../repo';
import { ContextEngine, FileContextStore } from '../select';
import { buildSelectionSnapshot } from '../select/snapshot';
import {
  initCodex,
  initCursor,
  proxyEnvSnippet,
  resolveInitPaths,
} from './init';

interface ParsedArgs {
  command: string;
  subcommand?: string;
  repoPath: string;
  storePath?: string;
  agentId?: string;
  dashboardUrl?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  let command = args[0] ?? '';
  let subcommand: string | undefined;
  let repoPath = '.';
  let storePath: string | undefined;
  let agentId: string | undefined;
  let dashboardUrl: string | undefined;

  // `rootrouter ./my-repo` → treat as index
  if (command && !command.startsWith('-') && (command.startsWith('.') || command.startsWith('/'))) {
    repoPath = command;
    command = 'index';
  }

  if (command === 'init' && args[1] && !args[1].startsWith('-')) {
    subcommand = args[1];
  }

  const start = command === 'init' ? 2 : 1;
  for (let i = start; i < args.length; i++) {
    const a = args[i];
    if (a === '--store' && args[i + 1]) {
      storePath = args[++i];
    } else if (a === '--agent' && args[i + 1]) {
      agentId = args[++i];
    } else if (a === '--dashboard' && args[i + 1]) {
      dashboardUrl = args[++i];
    } else if (!a.startsWith('-') && command === 'index') {
      repoPath = a;
    }
  }

  return { command, subcommand, repoPath, storePath, agentId, dashboardUrl };
}

function printUsage(): void {
  console.error(`RootRouter CLI

Usage:
  rootrouter index <repo-path> [--store <store.json>] [--agent <id>]
  rootrouter init cursor [--store <store.json>]
  rootrouter init codex [--store <store.json>]
  rootrouter snapshot [--store <store.json>] [--dashboard <url>]

One-liners (after npm install):
  npx rootrouter index ./my-repo
  npx rootrouter-proxy
  npx rootrouter-mcp
`);
}

async function runIndex(repoPath: string, storePath?: string, agentId?: string): Promise<void> {
  const resolved = path.resolve(repoPath);
  const result = indexRepo({ rootPath: resolved, agentId: agentId ?? 'repo' });

  const storeFile = storePath ?? process.env.ROOTROUTER_STORE_PATH;
  if (storeFile) {
    const engine = new ContextEngine({
      store: new FileContextStore({ filePath: storeFile }),
    });
    await engine.load();
    engine.record(result.items);
    await engine.save();
    console.error(`[rootrouter] upserted ${result.items.length} chunks -> ${storeFile}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        rootPath: result.stats.rootPath,
        filesScanned: result.stats.filesScanned,
        chunksIndexed: result.stats.chunksIndexed,
        edgesCreated: result.stats.edgesCreated,
        communities: result.stats.communities,
        maxDegree: result.stats.maxDegree,
        durationMs: result.stats.durationMs,
      },
      null,
      2
    )
  );
}

async function runInit(subcommand: string | undefined, storePath: string | undefined): Promise<void> {
  const cwd = process.cwd();
  const paths = resolveInitPaths(cwd);
  if (storePath) paths.storePath = path.resolve(storePath);

  if (subcommand === 'cursor') {
    const result = initCursor(cwd, paths);
    console.error(`[rootrouter] ${result.message}`);
    console.log(JSON.stringify({ ok: true, target: result.target, proxySnippet: proxyEnvSnippet(paths) }, null, 2));
    return;
  }

  if (subcommand === 'codex') {
    const result = initCodex(paths);
    console.error(`[rootrouter] ${result.message}`);
    console.log(JSON.stringify({ ok: true, target: result.target }, null, 2));
    return;
  }

  console.error('Usage: rootrouter init cursor|codex [--store <store.json>]');
  process.exit(1);
}

async function runSnapshot(storePath?: string, dashboardUrl?: string): Promise<void> {
  const storeFile = storePath ?? process.env.ROOTROUTER_STORE_PATH;
  if (!storeFile) {
    console.error('snapshot requires --store or ROOTROUTER_STORE_PATH');
    process.exit(1);
  }

  const engine = new ContextEngine({ store: new FileContextStore({ filePath: storeFile }) });
  await engine.load();
  const stats = engine.stats();
  const payload = buildSelectionSnapshot(engine.getStore(), stats);
  const runId = `selection-${Date.now()}`;
  const body = {
    runId,
    agentId: 'context-engine',
    snapshot: payload,
  };

  const dash = (dashboardUrl ?? process.env.DASHBOARD_URL)?.replace(/\/$/, '');
  if (dash) {
    const res = await fetch(`${dash}/api/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[rootrouter] dashboard upload failed: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    console.error(`[rootrouter] snapshot pushed to ${dash}/dashboard/topology`);
  }

  console.log(JSON.stringify({ ok: true, runId, ...payload }, null, 2));
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  const { command, subcommand, repoPath, storePath, agentId, dashboardUrl } = parsed;

  if (command === '--help' || command === '-h' || !command) {
    printUsage();
    process.exit(0);
  }

  if (command === 'index') {
    await runIndex(repoPath, storePath, agentId);
    return;
  }

  if (command === 'init') {
    await runInit(subcommand, storePath);
    return;
  }

  if (command === 'snapshot') {
    await runSnapshot(storePath, dashboardUrl);
    return;
  }

  printUsage();
  process.exit(1);
}

main().catch((err) => {
  console.error('[rootrouter] fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
