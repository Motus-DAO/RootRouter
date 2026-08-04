import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { summarizeSelectionAudit } from '../logs/selectionAudit';

export interface DoctorCliOptions {
  storePath?: string;
  proxyUrl?: string;
  cwd?: string;
  json?: boolean;
}

interface DoctorReport {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string; warn?: boolean }>;
  recommendedNextStep: string;
}

function defaultGlobalStorePath(): string {
  return path.join(os.homedir(), '.rootrouter', 'store.json');
}

function resolveStorePath(input?: string): string {
  if (input?.trim()) return path.resolve(input);
  if (process.env.ROOTROUTER_STORE_PATH?.trim()) return process.env.ROOTROUTER_STORE_PATH.trim();
  return defaultGlobalStorePath();
}

function readStoreStats(storePath: string): {
  exists: boolean;
  items: number;
  repoRoots: string[];
  agentIds: string[];
} {
  if (!fs.existsSync(storePath)) {
    return { exists: false, items: 0, repoRoots: [], agentIds: [] };
  }
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    if (!raw.trim()) return { exists: true, items: 0, repoRoots: [], agentIds: [] };
    const parsed = JSON.parse(raw) as {
      items?: Array<{ agentId?: string; metadata?: { repoRoot?: string } }>;
    };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const roots = new Set<string>();
    const agents = new Set<string>();
    for (const item of items) {
      const root = item.metadata?.repoRoot;
      if (typeof root === 'string' && root.trim()) roots.add(root);
      if (typeof item.agentId === 'string' && item.agentId.trim()) agents.add(item.agentId);
    }
    return {
      exists: true,
      items: items.length,
      repoRoots: [...roots].sort(),
      agentIds: [...agents].sort(),
    };
  } catch {
    return { exists: true, items: 0, repoRoots: [], agentIds: [] };
  }
}

function readCursorMcpStore(cwd: string): {
  ok: boolean;
  detail: string;
  storePath?: string;
  agentId?: string;
  binOk?: boolean;
} {
  const mcpPath = path.join(cwd, '.cursor', 'mcp.json');
  if (!fs.existsSync(mcpPath)) {
    return { ok: false, detail: `Missing ${mcpPath}. Run: rootrouter init cursor --project-store` };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(mcpPath, 'utf8')) as {
      mcpServers?: Record<
        string,
        { command?: string; args?: string[]; env?: Record<string, string> }
      >;
    };
    const entry = parsed.mcpServers?.rootrouter;
    if (!entry) {
      return { ok: false, detail: 'No mcpServers.rootrouter entry in .cursor/mcp.json' };
    }
    if (entry.command === 'node' && Array.isArray(entry.args) && entry.args[0]) {
      const bin = entry.args[0];
      if (!fs.existsSync(bin)) {
        return {
          ok: false,
          detail: `MCP server path missing: ${bin}. Run npm run mcp:build`,
          storePath: entry.env?.ROOTROUTER_STORE_PATH,
          agentId: entry.env?.ROOTROUTER_DEFAULT_AGENT_ID,
        };
      }
    }
    return {
      ok: true,
      detail: 'rootrouter MCP entry present in .cursor/mcp.json',
      storePath: entry.env?.ROOTROUTER_STORE_PATH,
      agentId: entry.env?.ROOTROUTER_DEFAULT_AGENT_ID,
      binOk: true,
    };
  } catch (err) {
    return {
      ok: false,
      detail: `Invalid .cursor/mcp.json: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function embeddingDetail(): { ok: boolean; detail: string } {
  const provider = (process.env.EMBEDDING_PROVIDER ?? '').toLowerCase() || 'tfidf';
  const model = process.env.EMBEDDING_LOCAL_MODEL ?? 'minilm';
  if (provider === 'api' && !process.env.EMBEDDING_API_KEY) {
    return { ok: false, detail: 'EMBEDDING_PROVIDER=api but EMBEDDING_API_KEY is missing' };
  }
  if (provider === 'local') {
    return { ok: true, detail: `Embedding provider: local (${model})` };
  }
  return { ok: true, detail: `Embedding provider: ${provider}` };
}

async function checkProxyHealth(proxyUrl?: string): Promise<{ ok: boolean; detail: string }> {
  const target = (proxyUrl ?? process.env.ROOTROUTER_PROXY_URL ?? '').trim();
  if (!target) {
    return { ok: true, detail: 'Proxy health skipped (set --proxy-url or ROOTROUTER_PROXY_URL)' };
  }
  const healthUrl = `${target.replace(/\/$/, '')}/healthz`;
  try {
    const res = await fetch(healthUrl);
    if (!res.ok) return { ok: false, detail: `Proxy unhealthy: ${res.status} ${healthUrl}` };
    return { ok: true, detail: `Proxy healthy: ${healthUrl}` };
  } catch (err) {
    return {
      ok: false,
      detail: `Proxy unreachable: ${healthUrl} (${err instanceof Error ? err.message : String(err)})`,
    };
  }
}

function isGlobalDefaultStore(storePath: string): boolean {
  return path.resolve(storePath) === path.resolve(defaultGlobalStorePath());
}

function looksLikeProjectStore(storePath: string): boolean {
  const normalized = path.resolve(storePath).replace(/\\/g, '/');
  return /\/\.rootrouter\/[^/]+\/(cursor|codex|proxy)-store\.json$/.test(normalized);
}

export async function runDoctorCli(options: DoctorCliOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const mcp = readCursorMcpStore(cwd);
  const storePath = resolveStorePath(options.storePath ?? mcp.storePath);
  const checks: DoctorReport['checks'] = [];

  const store = readStoreStats(storePath);
  checks.push({
    name: 'store',
    ok: store.exists,
    detail: store.exists
      ? `Store found: ${storePath} (${store.items} item(s))`
      : `Store missing: ${storePath}. Run: rootrouter index ./repo (or MCP index_repo)`,
  });

  const isolationOk = !store.exists || looksLikeProjectStore(storePath) || store.items === 0;
  const usingGlobal = isGlobalDefaultStore(storePath);
  if (usingGlobal) {
    checks.push({
      name: 'store_isolation',
      ok: false,
      warn: true,
      detail:
        `Store is the global default (${defaultGlobalStorePath()}). ` +
        `Motus / production: re-run rootrouter init cursor --project-store ` +
        `(see docs/insights/009-cursor-project-store-parity.md)`,
    });
  } else if (!looksLikeProjectStore(storePath) && store.exists) {
    checks.push({
      name: 'store_isolation',
      ok: true,
      warn: true,
      detail: `Custom store path (ok): ${storePath}`,
    });
  } else {
    checks.push({
      name: 'store_isolation',
      ok: isolationOk,
      detail: looksLikeProjectStore(storePath)
        ? `Per-project store path: ${storePath}`
        : `Store path: ${storePath}`,
    });
  }

  if (store.repoRoots.length > 1) {
    checks.push({
      name: 'store_namespaces',
      ok: false,
      detail:
        `Store mixes ${store.repoRoots.length} repoRoot namespaces (stew risk): ` +
        store.repoRoots.slice(0, 5).join(', ') +
        (store.repoRoots.length > 5 ? ', …' : '') +
        '. Reset/re-index with a per-project store.',
    });
  } else {
    checks.push({
      name: 'store_namespaces',
      ok: true,
      detail:
        store.repoRoots.length === 1
          ? `Single repoRoot in store: ${store.repoRoots[0]}`
          : 'No repoRoot metadata yet (empty or non-repo items)',
    });
  }

  const audit = summarizeSelectionAudit();
  checks.push({
    name: 'audit',
    ok: true,
    warn: audit.totalEntries === 0,
    detail:
      audit.totalEntries > 0
        ? `Selection audit: ${audit.totalEntries} entries (${audit.logPath})`
        : `No selection audit entries yet (${audit.logPath})`,
  });

  checks.push({
    name: 'mcp',
    ok: mcp.ok,
    detail:
      mcp.ok && mcp.agentId
        ? `${mcp.detail}; ROOTROUTER_DEFAULT_AGENT_ID=${mcp.agentId}`
        : mcp.detail,
  });

  const embedding = embeddingDetail();
  checks.push({ name: 'embedding', ok: embedding.ok, detail: embedding.detail });

  const proxy = await checkProxyHealth(options.proxyUrl);
  checks.push({ name: 'proxy', ok: proxy.ok, detail: proxy.detail });

  const blocking = checks.filter(
    (c) =>
      !c.ok &&
      (c.name === 'store_isolation' ||
        c.name === 'store_namespaces' ||
        c.name === 'mcp' ||
        c.name === 'embedding' ||
        c.name === 'proxy' ||
        c.name === 'store')
  );
  const exitOk = blocking.length === 0;

  let recommendedNextStep =
    store.items === 0
      ? 'Run: rootrouter index ./repo (or MCP index_repo once per cold slice)'
      : audit.totalEntries === 0
        ? 'Run a cold slice flow: select_for_spec or select_context, then rootrouter audit'
        : 'Looks healthy. Continue with slice work and use stats/list_selections at handoff.';

  if (usingGlobal) {
    recommendedNextStep =
      'Re-init with project store: rootrouter init cursor --project-store --project-agent-id <slug>';
  } else if (store.repoRoots.length > 1) {
    recommendedNextStep =
      'Delete or rotate the stewed store, then index_repo into a fresh per-project cursor-store.json';
  }

  const report: DoctorReport = { ok: exitOk, checks, recommendedNextStep };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`RootRouter doctor: ${exitOk ? 'OK' : 'ISSUES FOUND'}`);
    for (const c of checks) {
      const mark = c.ok ? 'ok' : c.warn ? '!' : 'x';
      console.log(`- [${mark}] ${c.name}: ${c.detail}`);
    }
    console.log(`\nRecommended next step: ${recommendedNextStep}`);
  }

  return exitOk ? 0 : 1;
}
