/**
 * Benchmark consistency and reproducibility tests.
 * Run: npm run test (or tsx test/benchmark.test.ts)
 */

import { runBenchmark, type BenchmarkMetrics } from '../demo/benchmark';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function main() {
  console.log('\n=== Benchmark consistency tests ===\n');

  // 1) Quick run with fixed seed
  const { metrics: m1 } = await runBenchmark({ seed: 42, quick: true });
  assert(m1.queries_count === 15, 'quick run has 15 queries');
  assert(m1.seed === 42, 'seed is recorded');
  assert(m1.baseline.raw_input_tokens > 0, 'baseline raw_input_tokens > 0');
  assert(m1.rootrouter.raw_input_tokens > 0, 'rootrouter raw_input_tokens > 0');
  assert(
    m1.rootrouter.effective_billed_tokens <= m1.rootrouter.raw_input_tokens,
    'effective_billed <= raw_input (filtering does not increase tokens)'
  );
  assert(
    m1.rootrouter.filtered_context_tokens <= m1.rootrouter.raw_input_tokens,
    'filtered_context <= raw_input'
  );
  assert(typeof m1.cost_savings_pct === 'number', 'cost_savings_pct is number');
  console.log('  PASS: quick seeded run produces valid metrics');

  // 2) Reproducibility: same seed => same numbers
  const { metrics: m2 } = await runBenchmark({ seed: 42, quick: true });
  assert(
    m1.baseline.raw_input_tokens === m2.baseline.raw_input_tokens,
    'baseline raw_input_tokens reproducible'
  );
  assert(
    m1.baseline.effective_billed_tokens === m2.baseline.effective_billed_tokens,
    'baseline effective_billed_tokens reproducible'
  );
  assert(
    m1.baseline.output_tokens === m2.baseline.output_tokens,
    'baseline output_tokens reproducible'
  );
  assert(
    m1.rootrouter.raw_input_tokens === m2.rootrouter.raw_input_tokens,
    'rootrouter raw_input_tokens reproducible'
  );
  assert(
    m1.rootrouter.effective_billed_tokens === m2.rootrouter.effective_billed_tokens,
    'rootrouter effective_billed_tokens reproducible'
  );
  assert(
    m1.rootrouter.output_tokens === m2.rootrouter.output_tokens,
    'rootrouter output_tokens reproducible'
  );
  assert(
    m1.cost_savings_pct === m2.cost_savings_pct,
    'cost_savings_pct reproducible'
  );
  console.log('  PASS: same seed gives identical metrics');

  // 3) Different seed => different output tokens (non-trivial)
  const { metrics: m3 } = await runBenchmark({ seed: 123, quick: true });
  const sameOutput =
    m1.baseline.output_tokens === m3.baseline.output_tokens &&
    m1.rootrouter.output_tokens === m3.rootrouter.output_tokens;
  assert(!sameOutput, 'different seed produces different output token counts');
  console.log('  PASS: different seed gives different results');

  console.log('\nAll benchmark consistency tests passed.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
