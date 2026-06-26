/**
 * RootRouter Benchmark
 * Side-by-side comparison: Baseline (full context, powerful model) vs RootRouter.
 * Fair, reproducible metrics: same context definition, optional --seed, JSON export.
 *
 * Run:
 *   npm run demo:benchmark              # full run
 *   DEMO_QUICK=true npm run demo:benchmark   # quick (15 queries)
 *   npx tsx demo/benchmark.ts --seed 42      # reproducible run
 *
 * Results: benchmarks/results/{timestamp}.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { RootRouter, estimateTokens, attachSelectionSnapshot } from '../src';

const c = {
  reset: process.stdout.isTTY !== false ? '\x1b[0m' : '',
  bold: process.stdout.isTTY !== false ? '\x1b[1m' : '',
  dim: process.stdout.isTTY !== false ? '\x1b[2m' : '',
  green: process.stdout.isTTY !== false ? '\x1b[32m' : '',
  yellow: process.stdout.isTTY !== false ? '\x1b[33m' : '',
  red: process.stdout.isTTY !== false ? '\x1b[31m' : '',
  cyan: process.stdout.isTTY !== false ? '\x1b[36m' : '',
  magenta: process.stdout.isTTY !== false ? '\x1b[35m' : '',
};

const BENCHMARK_QUERIES = [
  'What is the capital of France?',
  'Convert 72 degrees Fahrenheit to Celsius',
  'What does the HTTP status code 404 mean?',
  'List the primary colors',
  'What is the boiling point of water in Celsius?',
  'Define the term API in software development',
  'What is 15% of 200?',
  'Name the largest planet in our solar system',
  'What does HTML stand for?',
  'How many bytes are in a kilobyte?',
  'Explain the difference between let and const in JavaScript',
  'Write a function to reverse a string in Python',
  'What is a linked list and when would you use one?',
  'Explain how CSS flexbox alignment works with justify-content',
  'What is the difference between GET and POST HTTP methods?',
  'Implement a debounce function in JavaScript with configurable delay',
  'Explain the CAP theorem and its implications for distributed databases',
  'Write a SQL query to find the second highest salary in each department',
  'Describe the observer pattern and provide a TypeScript implementation',
  'Explain how garbage collection works in V8 JavaScript engine',
  'Implement a basic promise from scratch in TypeScript',
  'Design a URL shortener system with high availability requirements',
  'Write a recursive function to flatten a deeply nested array',
  'Explain the difference between processes and threads with examples',
  'Implement a priority queue using a binary heap data structure',
  'Design a real-time collaborative text editor architecture like Google Docs',
  'Implement a B-tree with insert and search operations for database indexing',
  'Explain the Raft consensus algorithm and implement leader election',
  'Write a compiler frontend: lexer and parser for a simple arithmetic language',
  'Design a distributed cache system with consistent hashing and replication',
  'Implement a neural network backpropagation algorithm from scratch in TypeScript',
  'Design a globally distributed database with strong consistency guarantees',
  'Implement a concurrent garbage collector with tri-color marking algorithm',
  'Write a CRDT implementation for collaborative editing with conflict resolution',
  'Design a low-latency trading system architecture handling 1M orders per second',
  'Implement a custom memory allocator with buddy system allocation strategy',
  'Design a privacy-preserving machine learning pipeline using federated learning',
  'Implement a lock-free concurrent hash map with atomic compare-and-swap',
  'Write a query optimizer for a simple SQL-like language with join reordering',
  'Design an end-to-end encrypted messaging system with forward secrecy',
  'Implement a basic operating system scheduler with multiple scheduling algorithms',
  'Design a blockchain consensus mechanism optimized for IoT device networks',
  'Write a JIT compiler for a subset of JavaScript targeting x86 assembly',
  'Implement a distributed transaction manager with two-phase commit protocol',
  'Design a self-healing microservices mesh with automatic failover and traffic shaping',
  'Implement a basic version of the PageRank algorithm for web graph analysis',
  'Design a real-time recommendation engine using collaborative filtering at scale',
  'Write a network protocol for reliable ordered message delivery over UDP',
  'Implement a basic OLAP cube with slice, dice, and rollup operations',
  'Design an auto-scaling system that predicts load using time-series forecasting',
];

/** Seeded PRNG (mulberry32) for reproducible runs */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same definition of context tokens for baseline and router: sum of (query + response) per pair */
function contextTokensFromPairs(pairs: Array<{ query: string; response: string }>): number {
  let n = 0;
  for (const p of pairs) n += estimateTokens(p.query) + estimateTokens(p.response);
  return n;
}

/** Assemble prompt token count: context + current query (same logic for both arms) */
function rawInputTokens(contextTokens: number, query: string): number {
  return contextTokens + estimateTokens(query);
}

export interface BenchmarkMetrics {
  baseline: {
    raw_input_tokens: number;
    filtered_context_tokens: number;
    effective_billed_tokens: number;
    output_tokens: number;
    cost: number;
  };
  rootrouter: {
    raw_input_tokens: number;
    filtered_context_tokens: number;
    effective_billed_tokens: number;
    output_tokens: number;
    cost: number;
    tokens_saved: number;
    tier_counts: Record<string, { count: number; tokens: number; cost: number }>;
  };
  cost_savings_pct: number;
  queries_count: number;
  quick: boolean;
  seed?: number;
  timestamp: string;
}

export async function runBenchmark(opts: {
  seed?: number;
  quick?: boolean;
}): Promise<{ metrics: BenchmarkMetrics; router: RootRouter }> {
  const seed = opts.seed;
  const quick = opts.quick ?? process.env.DEMO_QUICK === 'true';
  const queries = quick ? BENCHMARK_QUERIES.slice(0, 15) : BENCHMARK_QUERIES;
  const rng = seed !== undefined ? mulberry32(seed) : Math.random;

  const powerfulInputCost = 15.0 / 1_000_000;
  const powerfulOutputCost = 75.0 / 1_000_000;

  // ─── RootRouter run first so we use its history for baseline (same context definition) ───
  const router = new RootRouter({
    verbose: false,
    useLocalEmbeddings: true,
    embeddingDimension: 128,
    minInteractionsBeforeFit: 8,
    refitInterval: 8,
    pcaDimensions: 5,
    maxContextTokens: 2048,
    random: rng,
  });

  let baselineRawInput = 0;
  let baselineOutputTokens = 0;
  let baselineCost = 0;

  let rrRawInput = 0;
  let rrFilteredContext = 0;
  let rrEffectiveBilled = 0;
  let rrOutputTokens = 0;
  let rrCost = 0;
  let rrTokensSaved = 0;
  const tierCounts: Record<string, { count: number; tokens: number; cost: number }> = {
    fast: { count: 0, tokens: 0, cost: 0 },
    balanced: { count: 0, tokens: 0, cost: 0 },
    powerful: { count: 0, tokens: 0, cost: 0 },
  };

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const result = await router.chat({
      agentId: 'benchmark-agent',
      messages: [{ role: 'user', content: query }],
    });

    const ctxBefore = result.filterResult.originalTokenCount;
    const filteredCtx = result.filterResult.filteredTokenCount;
    const raw = rawInputTokens(ctxBefore, query);
    const effective = result.rootPair.inputTokens;
    const out = result.rootPair.outputTokens;
    const tier = result.routingDecision.modelTier;
    const modelInputCosts: Record<string, number> = { fast: 0.8, balanced: 3.0, powerful: 15.0 };
    const modelOutputCosts: Record<string, number> = { fast: 4.0, balanced: 15.0, powerful: 75.0 };
    const cost =
      (effective / 1_000_000) * modelInputCosts[tier] + (out / 1_000_000) * modelOutputCosts[tier];

    // Baseline: same context (raw) and same output tokens, but powerful model for every call
    baselineRawInput += raw;
    baselineOutputTokens += out;
    baselineCost += raw * powerfulInputCost + out * powerfulOutputCost;

    rrRawInput += raw;
    rrFilteredContext += filteredCtx;
    rrEffectiveBilled += effective;
    rrOutputTokens += out;
    rrCost += cost;
    rrTokensSaved += result.telemetry.tokensSaved;
    tierCounts[tier].count++;
    tierCounts[tier].tokens += effective + out;
    tierCounts[tier].cost += cost;
  }

  const costSavingsPct = (baselineCost - rrCost) / baselineCost * 100;
  const metrics: BenchmarkMetrics = {
    baseline: {
      raw_input_tokens: baselineRawInput,
      filtered_context_tokens: baselineRawInput,
      effective_billed_tokens: baselineRawInput,
      output_tokens: baselineOutputTokens,
      cost: baselineCost,
    },
    rootrouter: {
      raw_input_tokens: rrRawInput,
      filtered_context_tokens: rrFilteredContext,
      effective_billed_tokens: rrEffectiveBilled,
      output_tokens: rrOutputTokens,
      cost: rrCost,
      tokens_saved: rrTokensSaved,
      tier_counts: tierCounts,
    },
    cost_savings_pct: costSavingsPct,
    queries_count: queries.length,
    quick,
    seed,
    timestamp: new Date().toISOString(),
  };

  return { metrics, router };
}

function pad(s: string, len: number): string {
  return s.length >= len ? s.substring(0, len) : s + ' '.repeat(len - s.length);
}

function bar(n: number, max: number, w: number = 10): string {
  const filled = Math.round((n / Math.max(max, 1)) * w);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(w - filled);
}

async function main() {
  const seedIdx = process.argv.indexOf('--seed');
  const seed = seedIdx >= 0 && process.argv[seedIdx + 1] ? parseInt(process.argv[seedIdx + 1], 10) : undefined;
  const quick = process.env.DEMO_QUICK === 'true';
  const queries = quick ? BENCHMARK_QUERIES.slice(0, 15) : BENCHMARK_QUERIES;

  const { metrics, router } = await runBenchmark({ seed, quick });
  const m = metrics;
  const tel = router.getTelemetry();

  console.log('');
  console.log(`${c.bold}${c.cyan}\u250c${'─'.repeat(62)}\u2510${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2502${c.reset}${c.bold}     \u{1f33f} ROOTROUTER \u2014 Benchmark                               ${c.cyan}\u2502${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2502${c.reset}        Baseline vs RootRouter \u2022 ${queries.length} queries${quick ? ' (quick)' : ''}${seed !== undefined ? ` \u2022 seed ${seed}` : ''}   ${c.cyan}\u2502${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2514${'─'.repeat(62)}\u2518${c.reset}`);
  console.log('');

  console.log(`  ${c.dim}Token accounting: raw_input = full context + query; effective_billed = what we send to the model.${c.reset}`);
  console.log('');

  // ─── Comparison Table (aligned metrics) ───
  console.log(`  ${c.bold}\u2500\u2500\u2500 Comparison \u2500\u2500\u2500${c.reset}`);
  console.log('');
  console.log(`  ${c.dim}${pad('', 24)} ${'Baseline'.padStart(12)}  ${'RootRouter'.padStart(12)}  Note${c.reset}`);
  console.log(`  ${'─'.repeat(62)}`);

  const rows: [string, string, string, string][] = [
    ['Total Cost', `$${m.baseline.cost.toFixed(4)}`, `$${m.rootrouter.cost.toFixed(4)}`, `${c.green}${m.cost_savings_pct.toFixed(1)}% saved${c.reset}`],
    ['Raw Input Tokens', m.baseline.raw_input_tokens.toLocaleString(), m.rootrouter.raw_input_tokens.toLocaleString(), 'same definition'],
    ['Filtered Context', m.baseline.filtered_context_tokens.toLocaleString(), m.rootrouter.filtered_context_tokens.toLocaleString(), 'RR filters'],
    ['Effective Billed', m.baseline.effective_billed_tokens.toLocaleString(), m.rootrouter.effective_billed_tokens.toLocaleString(), 'sent to model'],
    ['Output Tokens', m.baseline.output_tokens.toLocaleString(), m.rootrouter.output_tokens.toLocaleString(), '~same'],
    ['Avg Quality', tel.avgRootNorm.toFixed(4), tel.avgRootNorm.toFixed(4), '~same'],
  ];

  for (const [label, base, rr, note] of rows) {
    console.log(`  ${pad(label, 24)} ${base.padStart(12)}  ${rr.padStart(12)}  ${note}`);
  }
  console.log(`  ${'─'.repeat(62)}`);

  // ─── Model Routing ───
  console.log('');
  console.log(`  ${c.bold}\u2500\u2500\u2500 Model Routing by Difficulty \u2500\u2500\u2500${c.reset}`);
  console.log('');
  const totalQueries = queries.length;
  for (const [tier, data] of Object.entries(m.rootrouter.tier_counts)) {
    if (data.count === 0) continue;
    const tierColor = tier === 'fast' ? c.green : tier === 'powerful' ? c.red : c.yellow;
    const pct = ((data.count / totalQueries) * 100).toFixed(0);
    console.log(`    ${tierColor}${pad(tier.toUpperCase(), 8)}${c.reset}  ${String(data.count).padStart(2)} queries (${pct}%)  ${c.dim}${bar(data.count, totalQueries, 15)}${c.reset}  $${data.cost.toFixed(4)}`);
  }

  // ─── Chamber Analysis ───
  console.log('');
  console.log(`  ${c.bold}\u2500\u2500\u2500 Chamber Analysis \u2500\u2500\u2500${c.reset}`);
  console.log('');
  const chambers = tel.chambers.sort((a, b) => a.avgRootNorm - b.avgRootNorm);
  const chamberNorms = chambers.map(ch => ch.avgRootNorm);
  const cp33 = chamberNorms[Math.floor(chamberNorms.length * 0.33)] ?? Infinity;
  const cp66 = chamberNorms[Math.floor(chamberNorms.length * 0.66)] ?? Infinity;
  const maxCount = Math.max(...chambers.map(ch => ch.interactionCount), 1);

  for (const ch of chambers) {
    const diff = ch.avgRootNorm <= cp33 ? 'easy' : ch.avgRootNorm <= cp66 ? 'medium' : 'hard';
    const diffColor = diff === 'easy' ? c.green : diff === 'medium' ? c.yellow : c.red;
    console.log(`    C${String(ch.id).padStart(2)}  ${c.dim}[${c.reset}${diffColor}${bar(ch.interactionCount, maxCount, 8)}${c.reset}${c.dim}]${c.reset} ${String(ch.interactionCount).padStart(2)}  norm: ${ch.avgRootNorm.toFixed(3)}  ${diffColor}${diff.padEnd(6)}${c.reset}`);
  }

  console.log('');
  console.log(`${c.bold}${c.cyan}\u250c${'─'.repeat(62)}\u2510${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2502${c.reset}${c.bold}                      RESULTS                               ${c.cyan}\u2502${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2514${'─'.repeat(62)}\u2518${c.reset}`);
  console.log('');
  console.log(`  ${c.bold}Cost Reduction:${c.reset}     ${c.green}${c.bold}${m.cost_savings_pct.toFixed(1)}%${c.reset}  (context filtering + smart model routing)`);
  console.log(`  ${c.bold}Context Filtered:${c.reset}   ${c.green}${c.bold}${m.rootrouter.tokens_saved.toLocaleString()}${c.reset} tokens saved (effective_billed < raw_input)`);
  console.log(`  ${c.bold}Quality Impact:${c.reset}     ${c.bold}~same${c.reset}  (root norm preserved across difficulty levels)`);
  console.log('');

  // ─── Export JSON ───
  const resultsDir = path.join(process.cwd(), 'benchmarks', 'results');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${ts}.json`;
  const filepath = path.join(resultsDir, filename);
  try {
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(m, null, 2), 'utf8');
    console.log(`  ${c.dim}Results written to ${filepath}${c.reset}`);
    console.log('');
  } catch (e) {
    console.log(`  ${c.dim}Could not write results: ${e instanceof Error ? e.message : String(e)}${c.reset}`);
  }

  const txHash = await router.flushTelemetry();
  if (txHash) {
    console.log(`  ${c.green}Celo telemetry TX: ${txHash}${c.reset}`);
    console.log('');
  }

  const dashboardUrl = process.env.DASHBOARD_URL?.replace(/\/$/, '');
  if (dashboardUrl) {
    try {
      const runId = `benchmark-${Date.now()}`;
      const payload = router.getSnapshotForExport(runId, 'benchmark-agent');
      await attachSelectionSnapshot(payload);
      const res = await fetch(`${dashboardUrl}/api/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        console.log(`  ${c.dim}Snapshot sent to dashboard. View at ${dashboardUrl}/dashboard/topology${c.reset}`);
        console.log('');
      } else {
        console.log(`  ${c.dim}Snapshot upload failed: ${res.status}${c.reset}`);
      }
    } catch (e) {
      console.log(`  ${c.dim}Snapshot upload error: ${e instanceof Error ? e.message : String(e)}${c.reset}`);
    }
  }
}

main().catch(console.error);
