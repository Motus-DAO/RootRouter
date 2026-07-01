/**
 * `rootrouter audit` — summarize MCP selection history from selections.jsonl.
 */
import {
  listSelectionAudit,
  summarizeSelectionAudit,
  getSelectionAuditPath,
} from '../logs/selectionAudit';

export interface AuditCliOptions {
  limit?: number;
  agentId?: string;
  json?: boolean;
  logPath?: string;
}

export function runAuditCli(options: AuditCliOptions = {}): void {
  const limit = options.limit ?? 20;
  const summary = summarizeSelectionAudit({
    logPath: options.logPath,
    agentId: options.agentId,
  });
  const recent = listSelectionAudit({
    logPath: options.logPath ?? summary.logPath,
    limit,
    agentId: options.agentId,
  });

  if (options.json) {
    console.log(JSON.stringify({ summary, recent }, null, 2));
    return;
  }

  if (summary.totalEntries === 0) {
    console.log(`No selection audit entries at ${summary.logPath}`);
    console.log('Run index_repo + select_context via MCP, or set ROOTROUTER_SELECTIONS_LOG_PATH.');
    return;
  }

  console.log('RootRouter MCP selection audit');
  console.log(`Log: ${summary.logPath}`);
  console.log(`Entries: ${summary.totalEntries}`);
  console.log(`Total tokens saved: ${summary.totalTokensSaved.toLocaleString()}`);
  console.log(`Avg % saved: ${summary.avgPercentSaved.toFixed(1)}%`);
  console.log(`Avg tokens out: ${Math.round(summary.avgTokensOut).toLocaleString()}`);
  console.log('');

  const agents = Object.entries(summary.byAgentId).sort((a, b) => b[1].tokensSaved - a[1].tokensSaved);
  if (agents.length > 0) {
    console.log('By agentId:');
    for (const [agent, v] of agents) {
      console.log(`  ${agent}: ${v.count} selections, ${v.tokensSaved.toLocaleString()} saved`);
    }
    console.log('');
  }

  console.log(`Recent selections (newest ${recent.length}):`);
  for (const e of recent) {
    const when = new Date(e.ts).toISOString().replace('T', ' ').slice(0, 19);
    const agent = e.agentId ?? 'default';
    const q = e.query.length > 72 ? `${e.query.slice(0, 69)}...` : e.query;
    console.log(
      `  ${when} | ${agent} | saved ${e.tokensSaved.toLocaleString()} (${e.percentSaved.toFixed(1)}%) | ${q}`
    );
  }
}

export function resolveAuditLogPath(): string {
  return getSelectionAuditPath();
}
