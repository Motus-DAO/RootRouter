/**
 * Append-only audit log for MCP / ContextEngine select_context calls.
 * One JSON line per selection at ROOTROUTER_SELECTIONS_LOG_PATH (default: sibling of store.json).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface SelectionAuditEntry {
  ts: number;
  id: string;
  query: string;
  agentId?: string;
  tokenBudget?: number;
  tokensIn: number;
  tokensOut: number;
  tokensSaved: number;
  percentSaved: number;
  selectedCount: number;
  selectedIds: string[];
  topRelevance?: number;
}

export interface SelectionAuditSummary {
  logPath: string;
  totalEntries: number;
  totalTokensSaved: number;
  avgPercentSaved: number;
  avgTokensOut: number;
  byAgentId: Record<string, { count: number; tokensSaved: number }>;
}

let logPathOverride: string | undefined;

/** Override log path (e.g. tests). */
export function setSelectionAuditPath(p: string): void {
  logPathOverride = p;
}

export function getSelectionAuditPath(): string {
  if (logPathOverride) return logPathOverride;
  const fromEnv = process.env.ROOTROUTER_SELECTIONS_LOG_PATH;
  if (fromEnv?.trim()) return fromEnv.trim();
  const storePath = process.env.ROOTROUTER_STORE_PATH;
  if (storePath?.trim()) {
    return path.join(path.dirname(storePath), 'selections.jsonl');
  }
  return path.join(os.homedir(), '.rootrouter', 'selections.jsonl');
}

/** Append one selection record. Never throws. */
export function appendSelectionAudit(entry: SelectionAuditEntry): void {
  try {
    const logPath = getSelectionAuditPath();
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (err) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        `[selectionAudit] failed to append: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

export interface ListSelectionAuditOptions {
  limit?: number;
  agentId?: string;
  since?: number;
  logPath?: string;
}

/** Read audit entries newest-first. */
export function listSelectionAudit(options: ListSelectionAuditOptions = {}): SelectionAuditEntry[] {
  const logPath = options.logPath ?? getSelectionAuditPath();
  if (!fs.existsSync(logPath)) return [];

  const raw = fs.readFileSync(logPath, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim());
  const entries: SelectionAuditEntry[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as SelectionAuditEntry;
      if (!parsed || typeof parsed.ts !== 'number') continue;
      if (options.since !== undefined && parsed.ts < options.since) continue;
      if (options.agentId !== undefined && parsed.agentId !== options.agentId) continue;
      entries.push(parsed);
    } catch {
      // skip corrupt lines
    }
  }

  entries.sort((a, b) => b.ts - a.ts);
  const limit = options.limit ?? entries.length;
  return entries.slice(0, limit);
}

/** Aggregate stats from the audit log. */
export function summarizeSelectionAudit(options: ListSelectionAuditOptions = {}): SelectionAuditSummary {
  const logPath = options.logPath ?? getSelectionAuditPath();
  const entries = listSelectionAudit({ ...options, limit: undefined });
  const byAgentId: SelectionAuditSummary['byAgentId'] = {};

  let totalTokensSaved = 0;
  let pctSum = 0;

  for (const e of entries) {
    totalTokensSaved += e.tokensSaved;
    pctSum += e.percentSaved;
    const key = e.agentId ?? '(default)';
    if (!byAgentId[key]) byAgentId[key] = { count: 0, tokensSaved: 0 };
    byAgentId[key].count += 1;
    byAgentId[key].tokensSaved += e.tokensSaved;
  }

  const n = entries.length;
  return {
    logPath,
    totalEntries: n,
    totalTokensSaved,
    avgPercentSaved: n > 0 ? pctSum / n : 0,
    avgTokensOut: n > 0 ? entries.reduce((s, e) => s + e.tokensOut, 0) / n : 0,
    byAgentId,
  };
}
