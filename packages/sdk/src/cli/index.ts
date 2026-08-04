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
  initHermes,
  proxyEnvSnippet,
  resolveInitPaths,
} from './init';
import { runAuditCli } from './audit';
import { runDoctorCli } from './doctor';

interface ParsedArgs {
  command: string;
  subcommand?: string;
  repoPath: string;
  storePath?: string;
  agentId?: string;
  dashboardUrl?: string;
  auditLimit?: number;
  json?: boolean;
  localEmbeddings?: boolean;
  activeSpecPath?: string;
  proxyUrl?: string;
  writeAgentsMd?: boolean;
  projectStore?: boolean;
  projectAgentId?: string;
  projectSlug?: string;
  dryRun?: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  let command = args[0] ?? '';
  let subcommand: string | undefined;
  let repoPath = '.';
  let storePath: string | undefined;
  let agentId: string | undefined;
  let dashboardUrl: string | undefined;
  let auditLimit: number | undefined;
  let json = false;
  let localEmbeddings = false;
  let activeSpecPath: string | undefined;
  let proxyUrl: string | undefined;
  let writeAgentsMd = false;
  let projectStore = false;
  let projectAgentId: string | undefined;
  let projectSlug: string | undefined;
  let dryRun = false;

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
    } else if (a === '--limit' && args[i + 1]) {
      auditLimit = Number(args[++i]);
    } else if (a === '--json') {
      json = true;
    } else if (a === '--local-embeddings') {
      localEmbeddings = true;
    } else if (a === '--active-spec' && args[i + 1]) {
      activeSpecPath = args[++i];
    } else if (a === '--proxy-url' && args[i + 1]) {
      proxyUrl = args[++i];
    } else if (a === '--write-agents-md') {
      writeAgentsMd = true;
    } else if (a === '--project-store') {
      projectStore = true;
    } else if (a === '--project-agent-id' && args[i + 1]) {
      projectAgentId = args[++i];
    } else if (a === '--project-slug' && args[i + 1]) {
      projectSlug = args[++i];
    } else if (a === '--dry-run') {
      dryRun = true;
    } else if (!a.startsWith('-') && command === 'index') {
      repoPath = a;
    }
  }

  return {
    command,
    subcommand,
    repoPath,
    storePath,
    agentId,
    dashboardUrl,
    auditLimit,
    json,
    localEmbeddings,
    activeSpecPath,
    proxyUrl,
    writeAgentsMd,
    projectStore,
    projectAgentId,
    projectSlug,
    dryRun,
  };
}

function printUsage(): void {
  console.error(`RootRouter CLI

Usage:
  rootrouter index <repo-path> [--store <store.json>] [--agent <id>]
  rootrouter init cursor [--store <store.json>] [--local-embeddings] [--active-spec <path>]
  rootrouter init codex [--store <store.json>] [--local-embeddings] [--active-spec <path>] [--write-agents-md] [--project-store] [--project-agent-id <id>]
  rootrouter init hermes [--proxy-url <url>] [--project-slug <slug>] [--dry-run]
  rootrouter snapshot [--store <store.json>] [--dashboard <url>]
  rootrouter audit [--limit <n>] [--agent <id>] [--json]
  rootrouter doctor [--store <store.json>] [--proxy-url <url>] [--json]

One-liners (beta on npm):
  npx rootrouter@beta index ./my-repo
  npx -p @rootrouter/proxy@beta rootrouter-proxy
  npx -p @rootrouter/mcp@beta rootrouter-mcp
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

async function runInit(
  subcommand: string | undefined,
  storePath: string | undefined,
  localEmbeddings?: boolean,
  activeSpecPath?: string,
  writeAgentsMd?: boolean,
  projectStore?: boolean,
  projectAgentId?: string,
  projectSlug?: string,
  dryRun?: boolean,
  proxyUrl?: string
): Promise<void> {
  const cwd = process.cwd();
  const paths = resolveInitPaths(cwd);
  if (storePath) paths.storePath = path.resolve(storePath);
  const initOptions = {
    localEmbeddings: localEmbeddings === true,
    activeSpecPath: activeSpecPath ? path.resolve(activeSpecPath) : undefined,
    writeAgentsMd: writeAgentsMd === true,
    projectStore: projectStore === true,
    projectAgentId,
  };

  if (subcommand === 'hermes') {
    const result = initHermes({
      proxyBaseUrl: proxyUrl,
      projectSlug,
      dryRun: dryRun === true,
      setDefaultProvider: true,
    });
    console.error(`[rootrouter] ${result.message}`);
    console.error(`Store (persona): ${result.storePath}`);
    console.error(`Agent id header: x-rootrouter-agent-id: ${result.agentId}`);
    console.error(`Project slug: ${result.projectSlug}`);
    console.error('');
    console.error('After project_switch, re-run: rootrouter init hermes');
    console.error('Or: Agents/Hermes/scripts/sync-rootrouter-agent-id.sh');
    console.error('Telegram: /new after provider change. Keep proxy LaunchAgent up.');
    console.log(
      JSON.stringify(
        {
          ok: true,
          target: result.target,
          storePath: result.storePath,
          agentId: result.agentId,
          projectSlug: result.projectSlug,
          proxyBaseUrl: result.proxyBaseUrl,
          dryRun: !!dryRun,
        },
        null,
        2
      )
    );
    return;
  }

  if (subcommand === 'cursor') {
    if (!initOptions.projectStore && !storePath) {
      console.error(
        '[rootrouter] Warning: init cursor without --project-store uses the global default store (demos only).'
      );
      console.error(
        '  Motus / production: rootrouter init cursor --project-store [--project-agent-id <slug>]'
      );
      console.error('');
    }
    const result = initCursor(cwd, paths, initOptions);
    console.error(`[rootrouter] ${result.message}`);
    console.error(`Store: ${result.storePath}`);
    console.error(`Default agentId: ${result.agentId}`);
    console.error('');
    console.error('Agent rule: .cursor/rules/rootrouter-mcp.mdc (cold vs warm path — skip on single-file fixes)');
    console.error('Handoff template: docs/templates/slice-handoff.md');
    console.error('Storage policy: docs/insights/009-cursor-project-store-parity.md');
    console.error('');
    if (initOptions.localEmbeddings) {
      console.error('Embeddings: local MiniLM (recommended for monorepos). Default without flag is TF-IDF (zero-dep).');
    } else {
      console.error('Embeddings: TF-IDF (zero-dep default). For monorepos: re-run with --local-embeddings');
    }
    console.error('');
    console.error('Spec workflow: set ROOTROUTER_ACTIVE_SPEC or use MCP select_for_spec (one-call from spec file).');
    console.error('(Motus projects may use MOTUS_ACTIVE_SPEC — same meaning.)');
    console.error('');
    console.error('Cursor uses MCP only. For transparent proxy + shared store (Codex/SDK agents):');
    console.error(proxyEnvSnippet(paths));
    console.log(
      JSON.stringify(
        {
          ok: true,
          target: result.target,
          storePath: result.storePath,
          agentId: result.agentId,
          projectStore: !!initOptions.projectStore,
          localEmbeddings: !!initOptions.localEmbeddings,
          proxySnippet: proxyEnvSnippet(paths),
        },
        null,
        2
      )
    );
    return;
  }

  if (subcommand === 'codex') {
    const result = initCodex(cwd, paths, initOptions);
    console.error(`[rootrouter] ${result.message}`);
    if (initOptions.localEmbeddings) {
      console.error('Embeddings: local MiniLM enabled in Codex MCP env.');
    }
    if (initOptions.projectStore) {
      console.error(`Per-project store: ${paths.storePath}`);
    }
    if (result.agentsMd) {
      console.error(`Global AGENTS.md: ${result.agentsMd.globalPath}`);
      console.error(`Project AGENTS.md: ${result.agentsMd.projectPath}`);
      console.error('Deployment matrix: docs/deployment-matrix.md');
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          target: result.target,
          storePath: paths.storePath,
          agentsMd: result.agentsMd ?? null,
        },
        null,
        2
      )
    );
    return;
  }

  console.error(
    'Usage: rootrouter init cursor|codex|hermes [--store <store.json>] [--local-embeddings] [--active-spec <path>] [--write-agents-md] [--project-store] [--project-agent-id <id>] [--project-slug <slug>] [--proxy-url <url>] [--dry-run]'
  );
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
  const {
    command,
    subcommand,
    repoPath,
    storePath,
    agentId,
    dashboardUrl,
    auditLimit,
    json,
    localEmbeddings,
    activeSpecPath,
    proxyUrl,
    writeAgentsMd,
    projectStore,
    projectAgentId,
    projectSlug,
    dryRun,
  } = parsed;

  if (command === '--help' || command === '-h' || !command) {
    printUsage();
    process.exit(0);
  }

  if (command === 'index') {
    await runIndex(repoPath, storePath, agentId);
    return;
  }

  if (command === 'init') {
    await runInit(
      subcommand,
      storePath,
      localEmbeddings,
      activeSpecPath,
      writeAgentsMd,
      projectStore,
      projectAgentId,
      projectSlug,
      dryRun,
      proxyUrl
    );
    return;
  }

  if (command === 'snapshot') {
    await runSnapshot(storePath, dashboardUrl);
    return;
  }

  if (command === 'audit') {
    runAuditCli({ limit: auditLimit, agentId, json });
    return;
  }

  if (command === 'doctor') {
    const code = await runDoctorCli({ storePath, proxyUrl, json });
    process.exit(code);
  }

  printUsage();
  process.exit(1);
}

main().catch((err) => {
  console.error('[rootrouter] fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
