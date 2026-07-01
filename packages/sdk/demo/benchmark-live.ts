/**
 * Live API benchmark — NVIDIA NIM (OpenAI-compatible) real completions.
 *
 * Compares RootRouter context filtering vs full-context baseline on the SAME model.
 * Spot-checks the last query with skipContextFilter to measure actual API prompt_tokens.
 *
 * Env (repo root .env.local):
 *   NVIDIA_NIM_API_KEY or LLM_API_KEY
 *   LLM_BASE_URL=https://integrate.api.nvidia.com/v1
 *   NVIDIA_NIM_MODEL=nvidia/nemotron-3-ultra-550b-a55b
 *   LLM_MAX_OUTPUT_TOKENS=512
 *
 * Run:
 *   npm run demo:benchmark-live
 *   npm run demo:benchmark-live -- --queries 8
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadRepoEnv } from './loadEnv';
import { RootRouter } from '../src';
import { BENCHMARK_QUERIES } from './benchmark-queries';

loadRepoEnv();

export interface LiveBenchmarkResult {
  provider: string;
  model: string;
  base_url: string;
  queries_count: number;
  timestamp: string;
  /** Sum of filter originalTokenCount (estimated full context). */
  estimated_full_context_tokens: number;
  /** Sum of filter filteredTokenCount (what RR assembles). */
  estimated_filtered_context_tokens: number;
  /** Sum of API prompt_tokens on filtered path. */
  api_prompt_tokens_filtered: number;
  /** API prompt_tokens on last query with skipContextFilter (if run). */
  api_prompt_tokens_baseline_spot?: number;
  estimated_context_savings_pct: number;
  api_context_savings_pct_spot?: number;
  /** Average API prompt-token savings on warm queries (paired filtered vs no-filter). */
  api_context_savings_pct_warm_avg?: number;
  warm_paired_queries?: number;
  total_output_tokens: number;
  total_latency_ms: number;
  per_query: Array<{
    query: string;
    original_tokens: number;
    filtered_tokens: number;
    prompt_tokens: number;
    output_tokens: number;
    latency_ms: number;
  }>;
}

function parseArgs(): { queries: number } {
  const idx = process.argv.indexOf('--queries');
  const n = idx >= 0 && process.argv[idx + 1] ? parseInt(process.argv[idx + 1], 10) : 8;
  return { queries: Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 8 };
}

export async function runLiveBenchmark(opts?: { queries?: number }): Promise<LiveBenchmarkResult> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY || process.env.LLM_API_KEY || '';
  const baseUrl = process.env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const model =
    process.env.NVIDIA_NIM_MODEL ||
    process.env.MODEL_POWERFUL ||
    'nvidia/nemotron-3-ultra-550b-a55b';

  if (!apiKey) {
    throw new Error('NVIDIA_NIM_API_KEY or LLM_API_KEY required in .env.local');
  }

  const queryCount = opts?.queries ?? parseArgs().queries;
  const queries = BENCHMARK_QUERIES.slice(0, queryCount);

  const router = new RootRouter({
    llmBaseUrl: baseUrl,
    llmApiKey: apiKey,
    models: { fast: model, balanced: model, powerful: model },
    useLocalEmbeddings: true,
    embeddingDimension: 128,
    minInteractionsBeforeFit: 3,
    refitInterval: 4,
    pcaDimensions: 5,
    maxContextTokens: 2048,
    verbose: false,
  });

  const perQuery: LiveBenchmarkResult['per_query'] = [];
  let estimatedFull = 0;
  let estimatedFiltered = 0;
  let apiPromptFiltered = 0;
  let totalOut = 0;
  let totalLatency = 0;

  /** After warm-up, compare filtered vs full-context API prompt tokens per query. */
  let apiSavingsWarmSum = 0;
  let apiSavingsWarmCount = 0;

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`[${i + 1}/${queries.length}] ${query.slice(0, 60)}${query.length > 60 ? '…' : ''}`);

    const result = await router.chat({
      agentId: 'nim-benchmark',
      messages: [{ role: 'user', content: query }],
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
      query,
      original_tokens: fr.originalTokenCount,
      filtered_tokens: fr.filteredTokenCount,
      prompt_tokens: result.rootPair.inputTokens,
      output_tokens: result.rootPair.outputTokens,
      latency_ms: result.rootPair.latencyMs,
    });

    // Warm queries: paired API spot (filtered vs full context, same history)
    if (i >= 3 && fr.originalTokenCount > fr.filteredTokenCount) {
      try {
        const baseline = await router.chat({
          agentId: 'nim-benchmark',
          messages: [{ role: 'user', content: query }],
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

  // Final query spot-check (informational)
  let apiBaselineSpot: number | undefined;
  let apiSavingsSpot: number | undefined;
  const lastQuery = queries[queries.length - 1];
  const lastFiltered = perQuery[perQuery.length - 1]?.prompt_tokens ?? 0;
  try {
    const baseline = await router.chat({
      agentId: 'nim-benchmark',
      messages: [{ role: 'user', content: lastQuery }],
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

  const apiSavingsWarmAvg =
    apiSavingsWarmCount > 0 ? apiSavingsWarmSum / apiSavingsWarmCount : undefined;

  const estimatedSavings =
    estimatedFull > 0 ? ((estimatedFull - estimatedFiltered) / estimatedFull) * 100 : 0;

  return {
    provider: 'NVIDIA NIM',
    model,
    base_url: baseUrl,
    queries_count: queries.length,
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
  const filepath = path.join(dir, `nim-live-${ts}.json`);
  const latestPath = path.join(dir, 'nim-latest.json');
  const body = JSON.stringify(result, null, 2);
  fs.writeFileSync(filepath, body, 'utf8');
  fs.writeFileSync(latestPath, body, 'utf8');
  return filepath;
}

async function main() {
  const { queries } = parseArgs();
  console.log(`\nRootRouter live benchmark — NVIDIA NIM (${queries} queries)\n`);

  const result = await runLiveBenchmark({ queries });
  const filepath = writeResults(result);

  console.log('\n── Results ──');
  console.log(`  Model:              ${result.model}`);
  console.log(`  Queries:            ${result.queries_count}`);
  console.log(
    `  Context (est.):     ${result.estimated_full_context_tokens} → ${result.estimated_filtered_context_tokens} tokens`
  );
  console.log(`  Savings (est.):     ${result.estimated_context_savings_pct.toFixed(1)}%`);
  console.log(`  API prompt (sum):   ${result.api_prompt_tokens_filtered}`);
  if (result.api_context_savings_pct_warm_avg != null) {
    console.log(
      `  API warm avg savings: ${result.api_context_savings_pct_warm_avg.toFixed(1)}% (${result.warm_paired_queries} paired queries)`
    );
  }
  if (result.api_prompt_tokens_baseline_spot != null) {
    console.log(`  Baseline spot API:  ${result.api_prompt_tokens_baseline_spot} prompt tokens (last query, no filter)`);
    console.log(`  API spot savings:   ${result.api_context_savings_pct_spot?.toFixed(1)}%`);
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
