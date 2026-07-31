/**
 * Live API benchmark — NVIDIA NIM (OpenAI-compatible) real completions.
 *
 * Profiles (use the full demos, not the truncated trivia subset):
 *   session   — chained coding slice (default; best for context growth)
 *   basic     — demo/basic.ts categories interleaved
 *   swarm     — demo/swarm.ts warmup + complex tasks
 *   benchmark — 50-query easy→hard corpus
 *
 * Run:
 *   npm run demo:benchmark-live
 *   npm run demo:benchmark-live -- --profile session
 *   npm run demo:benchmark-live -- --profile basic --rounds 3
 *   npm run demo:benchmark-live -- --profile swarm
 *   DEMO_QUICK=true npm run demo:benchmark-live -- --profile benchmark
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadRepoEnv } from './loadEnv';
import { RootRouter } from '../src';
import {
  resolveLiveSteps,
  type LiveProfile,
  type LiveQueryStep,
} from './benchmark-queries';

loadRepoEnv();

export interface LiveBenchmarkResult {
  provider: string;
  model: string;
  base_url: string;
  profile: LiveProfile;
  profile_description: string;
  queries_count: number;
  timestamp: string;
  estimated_full_context_tokens: number;
  estimated_filtered_context_tokens: number;
  api_prompt_tokens_filtered: number;
  api_prompt_tokens_baseline_spot?: number;
  estimated_context_savings_pct: number;
  api_context_savings_pct_spot?: number;
  api_context_savings_pct_warm_avg?: number;
  warm_paired_queries?: number;
  total_output_tokens: number;
  total_latency_ms: number;
  per_query: Array<{
    agent_id: string;
    category?: string;
    task?: string;
    query: string;
    original_tokens: number;
    filtered_tokens: number;
    prompt_tokens: number;
    output_tokens: number;
    latency_ms: number;
    tokens_saved: number;
  }>;
}

function parseArgs(): {
  profile: LiveProfile;
  queries?: number;
  rounds?: number;
  quick: boolean;
} {
  const profileIdx = process.argv.indexOf('--profile');
  const rawProfile = profileIdx >= 0 ? process.argv[profileIdx + 1] : 'session';
  const profile = (['benchmark', 'basic', 'swarm', 'session'].includes(rawProfile)
    ? rawProfile
    : 'session') as LiveProfile;

  const queriesIdx = process.argv.indexOf('--queries');
  const queries =
    queriesIdx >= 0 && process.argv[queriesIdx + 1]
      ? parseInt(process.argv[queriesIdx + 1], 10)
      : undefined;

  const roundsIdx = process.argv.indexOf('--rounds');
  const rounds =
    roundsIdx >= 0 && process.argv[roundsIdx + 1]
      ? parseInt(process.argv[roundsIdx + 1], 10)
      : undefined;

  return {
    profile,
    queries: Number.isFinite(queries) && queries! > 0 ? queries : undefined,
    rounds: Number.isFinite(rounds) && rounds! > 0 ? rounds : undefined,
    quick: process.env.DEMO_QUICK === 'true',
  };
}

export async function runLiveBenchmark(opts?: {
  profile?: LiveProfile;
  queries?: number;
  rounds?: number;
  quick?: boolean;
  steps?: LiveQueryStep[];
}): Promise<LiveBenchmarkResult> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY || process.env.LLM_API_KEY || '';
  const baseUrl = process.env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const model =
    process.env.NVIDIA_NIM_MODEL ||
    process.env.MODEL_POWERFUL ||
    'nvidia/nemotron-3-ultra-550b-a55b';

  if (!apiKey) {
    throw new Error('NVIDIA_NIM_API_KEY or LLM_API_KEY required in .env.local');
  }

  const args = parseArgs();
  const profile = opts?.profile ?? args.profile;
  const resolved =
    opts?.steps != null
      ? {
          profile,
          steps: opts.steps,
          description: `custom (${opts.steps.length} steps)`,
        }
      : resolveLiveSteps({
          profile,
          queries: opts?.queries ?? args.queries,
          rounds: opts?.rounds ?? args.rounds,
          quick: opts?.quick ?? args.quick,
        });

  const router = new RootRouter({
    llmBaseUrl: baseUrl,
    llmApiKey: apiKey,
    models: { fast: model, balanced: model, powerful: model },
    useLocalEmbeddings: true,
    embeddingDimension: 128,
    minInteractionsBeforeFit: 4,
    refitInterval: 5,
    pcaDimensions: 5,
    maxContextTokens: 4096,
    verbose: false,
  });

  const perQuery: LiveBenchmarkResult['per_query'] = [];
  let estimatedFull = 0;
  let estimatedFiltered = 0;
  let apiPromptFiltered = 0;
  let totalOut = 0;
  let totalLatency = 0;
  let apiSavingsWarmSum = 0;
  let apiSavingsWarmCount = 0;

  for (let i = 0; i < resolved.steps.length; i++) {
    const step = resolved.steps[i];
    const label = step.task ?? step.category ?? step.agentId;
    console.log(
      `[${i + 1}/${resolved.steps.length}] ${label}: ${step.query.slice(0, 70)}${step.query.length > 70 ? '…' : ''}`
    );

    const result = await router.chat({
      agentId: step.agentId,
      messages: [{ role: 'user', content: step.query }],
      skipRouting: true,
      forceModel: model,
    });

    const fr = result.filterResult;
    estimatedFull += fr.originalTokenCount;
    estimatedFiltered += fr.filteredTokenCount;
    apiPromptFiltered += result.rootPair.inputTokens;
    totalOut += result.rootPair.outputTokens;
    totalLatency += result.rootPair.latencyMs;

    perQuery.push({
      agent_id: step.agentId,
      category: step.category,
      task: step.task,
      query: step.query,
      original_tokens: fr.originalTokenCount,
      filtered_tokens: fr.filteredTokenCount,
      prompt_tokens: result.rootPair.inputTokens,
      output_tokens: result.rootPair.outputTokens,
      latency_ms: result.rootPair.latencyMs,
      tokens_saved: result.telemetry.tokensSaved,
    });

    if (i >= 3 && fr.originalTokenCount > fr.filteredTokenCount) {
      try {
        const baseline = await router.chat({
          agentId: step.agentId,
          messages: [{ role: 'user', content: step.query }],
          skipContextFilter: true,
          skipRouting: true,
          forceModel: model,
        });
        const basePrompt = baseline.rootPair.inputTokens;
        const filteredPrompt = result.rootPair.inputTokens;
        if (basePrompt > 0 && basePrompt >= filteredPrompt) {
          apiSavingsWarmSum += ((basePrompt - filteredPrompt) / basePrompt) * 100;
          apiSavingsWarmCount++;
        }
      } catch {
        // skip paired spot on failure
      }
    }
  }

  let apiBaselineSpot: number | undefined;
  let apiSavingsSpot: number | undefined;
  const last = resolved.steps[resolved.steps.length - 1];
  const lastFiltered = perQuery[perQuery.length - 1]?.prompt_tokens ?? 0;
  if (last) {
    try {
      const baseline = await router.chat({
        agentId: last.agentId,
        messages: [{ role: 'user', content: last.query }],
        skipContextFilter: true,
        skipRouting: true,
        forceModel: model,
      });
      apiBaselineSpot = baseline.rootPair.inputTokens;
      if (apiBaselineSpot > 0 && apiBaselineSpot >= lastFiltered) {
        apiSavingsSpot = ((apiBaselineSpot - lastFiltered) / apiBaselineSpot) * 100;
      }
    } catch (e) {
      console.warn('Baseline spot-check skipped:', e instanceof Error ? e.message : e);
    }
  }

  const estimatedSavings =
    estimatedFull > 0 ? ((estimatedFull - estimatedFiltered) / estimatedFull) * 100 : 0;
  const apiSavingsWarmAvg =
    apiSavingsWarmCount > 0 ? apiSavingsWarmSum / apiSavingsWarmCount : undefined;

  return {
    provider: 'NVIDIA NIM',
    model,
    base_url: baseUrl,
    profile: resolved.profile,
    profile_description: resolved.description,
    queries_count: resolved.steps.length,
    timestamp: new Date().toISOString(),
    estimated_full_context_tokens: estimatedFull,
    estimated_filtered_context_tokens: estimatedFiltered,
    api_prompt_tokens_filtered: apiPromptFiltered,
    api_prompt_tokens_baseline_spot: apiBaselineSpot,
    estimated_context_savings_pct: estimatedSavings,
    api_context_savings_pct_spot: apiSavingsSpot,
    api_context_savings_pct_warm_avg: apiSavingsWarmAvg,
    warm_paired_queries: apiSavingsWarmCount,
    total_output_tokens: totalOut,
    total_latency_ms: totalLatency,
    per_query: perQuery,
  };
}

function writeResults(result: LiveBenchmarkResult): string {
  const repoRoot = path.resolve(__dirname, '../../..');
  const dir = path.join(repoRoot, 'benchmarks', 'results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ts = result.timestamp.replace(/[:.]/g, '-').slice(0, 19);
  const filepath = path.join(dir, `nim-live-${result.profile}-${ts}.json`);
  const latestPath = path.join(dir, 'nim-latest.json');
  const body = JSON.stringify(result, null, 2);
  fs.writeFileSync(filepath, body, 'utf8');
  fs.writeFileSync(latestPath, body, 'utf8');
  return filepath;
}

async function main() {
  const args = parseArgs();
  console.log(`\nRootRouter live benchmark — NVIDIA NIM`);
  console.log(`Profile: ${args.profile}${args.quick ? ' (quick)' : ''}\n`);

  const result = await runLiveBenchmark(args);
  const filepath = writeResults(result);

  console.log('\n── Results ──');
  console.log(`  Profile:            ${result.profile} — ${result.profile_description}`);
  console.log(`  Model:              ${result.model}`);
  console.log(`  Steps:              ${result.queries_count}`);
  console.log(
    `  Context (est.):     ${result.estimated_full_context_tokens} → ${result.estimated_filtered_context_tokens} tokens`
  );
  console.log(`  Savings (est.):     ${result.estimated_context_savings_pct.toFixed(1)}%`);
  console.log(`  Tokens saved (RR):  ${result.per_query.reduce((s, q) => s + q.tokens_saved, 0)}`);
  console.log(`  API prompt (sum):   ${result.api_prompt_tokens_filtered}`);
  if (result.api_context_savings_pct_warm_avg != null) {
    console.log(
      `  API warm avg:       ${result.api_context_savings_pct_warm_avg.toFixed(1)}% (${result.warm_paired_queries} paired)`
    );
  }
  if (result.api_prompt_tokens_baseline_spot != null && result.api_context_savings_pct_spot != null) {
    console.log(`  Baseline spot:      ${result.api_context_savings_pct_spot.toFixed(1)}% on last query`);
  }
  console.log(`  Output tokens:      ${result.total_output_tokens}`);
  console.log(`  Latency total:      ${(result.total_latency_ms / 1000).toFixed(1)}s`);
  console.log(`\n  Written: ${filepath}`);
  console.log(`           benchmarks/results/nim-latest.json\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
