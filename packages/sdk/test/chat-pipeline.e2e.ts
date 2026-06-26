/**
 * E2E tests for chat pipeline: cold start, warm start, refit cycle, LLM API failure.
 * Run: npx tsx test/chat-pipeline.e2e.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { RootRouter, setRouterMetricsPath } from '../src';

const LOGS_DIR = path.join(__dirname, 'e2e-logs');
const METRICS_PATH = path.join(LOGS_DIR, 'router-metrics.jsonl');

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function ensureLogsDir(): Promise<void> {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

async function lastMetricsLine(): Promise<Record<string, unknown> | null> {
  if (!fs.existsSync(METRICS_PATH)) return null;
  const content = fs.readFileSync(METRICS_PATH, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  return JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
}

async function main() {
  await ensureLogsDir();
  setRouterMetricsPath(METRICS_PATH);
  if (fs.existsSync(METRICS_PATH)) fs.unlinkSync(METRICS_PATH);

  console.log('\n=== Chat pipeline E2E tests ===\n');

  // ─── 1) Cold start: first chat, no history, isWarmStart false ───
  {
    const router = new RootRouter({
      minInteractionsBeforeFit: 20,
      refitInterval: 20,
      llmApiKey: '', // simulated
    });
    const result = await router.chat({
      agentId: 'e2e-agent',
      messages: [{ role: 'user', content: 'What is 2+2?' }],
    });
    assert(!!result.response, 'cold start returns response');
    assert(result.telemetry.isWarmStart === false, 'cold start: isWarmStart false');
    assert(!!result.routingDecision.reasoning, 'cold start: routing reasoning present');
    const last = await lastMetricsLine();
    assert(!!last && last.run_id && last.query_id, 'cold start: metrics line has run_id, query_id');
    console.log('  PASS: cold start');
  }

  // ─── 2) Warm start: enough interactions then fit; next chat is warm ───
  {
    const router = new RootRouter({
      minInteractionsBeforeFit: 2,
      refitInterval: 5,
      llmApiKey: '',
    });
    await router.chat({ agentId: 'warm-agent', messages: [{ role: 'user', content: 'First query' }] });
    await router.chat({ agentId: 'warm-agent', messages: [{ role: 'user', content: 'Second query' }] });
    await router.chat({ agentId: 'warm-agent', messages: [{ role: 'user', content: 'Third query' }] });
    const result = await router.chat({ agentId: 'warm-agent', messages: [{ role: 'user', content: 'Fourth query' }] });
    assert(result.telemetry.isWarmStart === true, 'warm start: isWarmStart true after refit');
    console.log('  PASS: warm start');
  }

  // ─── 3) Refit cycle: refit runs and chambers exist ───
  {
    const router = new RootRouter({
      minInteractionsBeforeFit: 3,
      refitInterval: 2,
      llmApiKey: '',
    });
    for (let i = 0; i < 6; i++) {
      await router.chat({
        agentId: 'refit-agent',
        messages: [{ role: 'user', content: `Refit query ${i}` }],
      });
    }
    const telemetry = router.getTelemetry();
    assert(telemetry.chambers.length > 0, 'refit cycle: chambers populated');
    assert(telemetry.totalInteractions >= 6, 'refit cycle: interactions recorded');
    console.log('  PASS: refit cycle');
  }

  // ─── 4) LLM API failure: invalid URL → executeLLM throws after retries ───
  {
    const router = new RootRouter({
      llmApiKey: 'fake-key',
      llmBaseUrl: 'http://127.0.0.1:31999', // nothing listening
    });
    let threw = false;
    try {
      await router.chat({
        agentId: 'fail-agent',
        messages: [{ role: 'user', content: 'Will fail' }],
      });
    } catch (e) {
      threw = true;
      assert(
        (e instanceof Error && (e.message.includes('executeLLM') || e.message.includes('attempts') || e.message.includes('fetch'))),
        'LLM failure: error message indicates LLM/executeLLM or retries'
      );
    }
    assert(threw, 'LLM API failure: chat throws');
    const last = await lastMetricsLine();
    const stageErrors = last?.stage_errors as Record<string, string> | undefined;
    assert(
      !!(stageErrors && (stageErrors.executeLLM || stageErrors.embedResponse)),
      'LLM failure: metrics contain stage_errors for executeLLM or later stage'
    );
    console.log('  PASS: LLM API failure');
  }

  console.log('\nAll chat pipeline E2E tests passed.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
