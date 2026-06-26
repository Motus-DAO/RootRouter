/**
 * Structured logging for chat pipeline: run_id, query_id, route_reason, filter_breakdown.
 * Writes one JSON line per chat to logs/router-metrics.jsonl.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { FilterResult, RoutingDecision } from '../types';

export interface RouterMetricsEntry {
  ts: number;
  run_id: string;
  query_id: string;
  route_reason: string;
  filter_breakdown: {
    byChamber: number;
    byGraph: number;
    byReflection: number;
    byRecency: number;
  };
  model_used: string;
  chamber_id: number | null;
  context_tokens_before: number;
  context_tokens_after: number;
  tokens_saved: number;
  is_warm_start: boolean;
  stage_errors?: Record<string, string>;
}

const DEFAULT_LOG_DIR = path.join(process.cwd(), 'logs');
const DEFAULT_LOG_FILE = path.join(DEFAULT_LOG_DIR, 'router-metrics.jsonl');

let logPath = DEFAULT_LOG_FILE;

/** Set custom log file path (e.g. for tests). */
export function setRouterMetricsPath(p: string): void {
  logPath = p;
}

/** Get current log file path. */
export function getRouterMetricsPath(): string {
  return logPath;
}

/** Append one metrics line. Ensures logs dir exists; never throws. */
export function appendRouterMetrics(entry: RouterMetricsEntry): void {
  try {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logPath, line, 'utf8');
  } catch {
    // Best-effort; do not crash the app
  }
}

/** Minimal entry for error cases (before we have filterResult/routingDecision). */
export interface RouterMetricsErrorEntry {
  ts: number;
  run_id: string;
  query_id: string;
  stage_errors: Record<string, string>;
}

export function appendRouterMetricsError(entry: RouterMetricsErrorEntry): void {
  try {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logPath, line, 'utf8');
  } catch {
    // Best-effort
  }
}

/** Build metrics entry from pipeline outputs for appendRouterMetrics. */
export function buildRouterMetricsEntry(params: {
  runId: string;
  queryId: string;
  filterResult: FilterResult;
  routingDecision: RoutingDecision;
  isWarmStart: boolean;
  stageErrors?: Record<string, string>;
}): RouterMetricsEntry {
  const { runId, queryId, filterResult, routingDecision, isWarmStart, stageErrors } = params;
  return {
    ts: Date.now(),
    run_id: runId,
    query_id: queryId,
    route_reason: routingDecision.reasoning,
    filter_breakdown: { ...filterResult.retrievalBreakdown },
    model_used: routingDecision.selectedModel,
    chamber_id: routingDecision.chamberId,
    context_tokens_before: routingDecision.contextTokensBefore,
    context_tokens_after: routingDecision.contextTokensAfter,
    tokens_saved: filterResult.tokensSaved,
    is_warm_start: isWarmStart,
    ...(stageErrors && Object.keys(stageErrors).length > 0 ? { stage_errors: stageErrors } : {}),
  };
}
