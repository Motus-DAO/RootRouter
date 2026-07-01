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
  checks: Array<{ name: string; ok: boolean; detail: string }>;
  recommendedNextStep: string;
}

function resolveStorePath(input?: string): string {
  if (input?.trim()) return path.resolve(input);
  if (process.env.ROOTROUTER_STORE_PATH?.trim()) return process.env.ROOTROUTER_STORE_PATH.trim();
  return path.join(os.homedir(), '.rootrouter', 'store.json');
}

function readStoreStats(storePath: string): { exists: boolean; items: number } {
  if (!fs.existsSync(storePath)) return { exists: false, items: 0 };
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    if (!raw.trim()) return { exists: true, items: 0 };
    const parsed = JSON.parse(raw) as { items?: unknown[] };
    const items = Array.isArray(parsed.items) ? parsed.items.length : 0;
    return { exists: true, items };
  } catch {
    return { exists: true, items: 0 };
  }
}

function checkMcpConfig(cwd: string): { ok: boolean; detail: string } {
  const mcpPath = path.join(cwd, '.cursor', 'mcp.json');
  if (!fs.existsSync(mcpPath)) {
    return { ok: false, detail: `Missing ${mcpPath}. Run: rootrouter init cursor` };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(mcpPath, 'utf8')) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>;
    };
    const entry = parsed.mcpServers?.rootrouter;
    if (!entry) {
      return { ok: false, detail: 'No mcpServers.rootrouter entry in .cursor/mcp.json' };
    }
    if (entry.command === 'node' && Array.isArray(entry.args) && entry.args[0]) {
      const bin = entry.args[0];
      if (!fs.existsSync(bin)) {
        return { ok: false, detail: `MCP server path missing: ${bin}. Run npm run mcp:build` };
      }
    }
    return { ok: true, detail: 'rootrouter MCP entry present in .cursor/mcp.json' };
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

export async function runDoctorCli(options: DoctorCliOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const storePath = resolveStorePath(options.storePath);
  const checks: DoctorReport['checks'] = [];

  const store = readStoreStats(storePath);
  checks.push({
    name: 'store',
    ok: store.exists,
    detail: store.exists
      ? `Store found: ${storePath} (${store.items} item(s))`
      : `Store missing: ${storePath}. Run: rootrouter index ./repo`,
  });

  const audit = summarizeSelectionAudit();
  checks.push({
    name: 'audit',
    ok: audit.totalEntries > 0,
    detail:
      audit.totalEntries > 0
        ? `Selection audit: ${audit.totalEntries} entries (${audit.logPath})`
        : `No selection audit entries yet (${audit.logPath})`,
  });

  const mcp = checkMcpConfig(cwd);
  checks.push({ name: 'mcp', ok: mcp.ok, detail: mcp.detail });

  const embedding = embeddingDetail();
  checks.push({ name: 'embedding', ok: embedding.ok, detail: embedding.detail });

  const proxy = await checkProxyHealth(options.proxyUrl);
  checks.push({ name: 'proxy', ok: proxy.ok, detail: proxy.detail });

  const ok = checks.every((c) => c.ok);
  const recommendedNextStep =
    store.items === 0
      ? 'Run: rootrouter index ./repo'
      : audit.totalEntries === 0
        ? 'Run a cold slice flow: select_for_spec or select_context, then rootrouter audit'
        : 'Looks healthy. Continue with slice work and use stats/list_selections at handoff.';

  const report: DoctorReport = { ok, checks, recommendedNextStep };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`RootRouter doctor: ${ok ? 'OK' : 'ISSUES FOUND'}`);
    for (const c of checks) {
      console.log(`- [${c.ok ? 'ok' : 'x'}] ${c.name}: ${c.detail}`);
    }
    console.log(`\nRecommended next step: ${recommendedNextStep}`);
  }

  return ok ? 0 : 1;
}
