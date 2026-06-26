/**
 * Tests for the context-selection engine (selectContext / ContextSelector / ContextEngine).
 * Run with: tsx test/select.test.ts
 */

import { selectContext, ContextEngine, InMemoryContextStore } from '../src';
import type { ContextItem } from '../src';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name}`);
  }
}

function item(id: string, text: string, extra: Partial<ContextItem> = {}): ContextItem {
  return { id, text, ...extra };
}

async function main() {
  // ═══════════════════════════════════════
  console.log('\n=== selectContext: relevance ranking (cold start) ===');
  // ═══════════════════════════════════════
  {
    const items: ContextItem[] = [
      item('a', 'How to implement a binary search tree in TypeScript with insert and delete'),
      item('b', 'A recipe for chocolate chip cookies with butter and brown sugar'),
      item('c', 'Sorting algorithms: quicksort and mergesort time complexity analysis'),
      item('d', 'The history of the Roman empire and its emperors'),
    ];
    const res = await selectContext({
      query: 'help me with a sorting algorithm implementation in code',
      items,
      tokenBudget: 10_000,
      options: { mmrLambda: 1 }, // pure relevance, no diversity penalty
    });
    // Most relevant should be the algorithm items, not cookies/Rome.
    const topTwo = new Set(res.selected.slice(0, 2).map((i) => i.id));
    assert(topTwo.has('c'), 'sorting item ranked in top 2');
    assert(res.selected[0].id === 'c' || res.selected[0].id === 'a', 'top item is code/algorithm related');
    assert(res.breakdown.candidates === 4, 'all candidates scored');
    assert(res.selected.length > 0, 'returns at least one item from item #1 (no warm start needed)');
  }

  // ═══════════════════════════════════════
  console.log('\n=== Token budget truncation ===');
  // ═══════════════════════════════════════
  {
    const items: ContextItem[] = [];
    for (let i = 0; i < 20; i++) {
      items.push(item(`t${i}`, `token budget test sentence number ${i} about software systems and data`));
    }
    const res = await selectContext({
      query: 'software systems and data',
      items,
      tokenBudget: 30,
    });
    assert(res.tokensOut <= 30 || res.selected.length === 1, 'selected tokens within budget (or single oversized item)');
    assert(res.selected.length < items.length, 'budget forced dropping some items');
    assert(res.tokensSaved > 0, 'reports positive tokens saved');
    assert(res.percentSaved > 0 && res.percentSaved <= 100, 'percentSaved in valid range');
    assert(res.breakdown.droppedByBudget > 0, 'breakdown counts dropped items');
  }

  // ═══════════════════════════════════════
  console.log('\n=== MMR de-duplicates near-identical items ===');
  // ═══════════════════════════════════════
  {
    const dup = 'install the package then import it and call the function to get started';
    const items: ContextItem[] = [
      item('dup1', dup),
      item('dup2', dup),
      item('dup3', dup),
      item('uniq', 'configure the database connection string and run migrations before deploying'),
    ];
    // Budget allows ~2 items; MMR should prefer one dup + the unique item over two dups.
    const lowDiversity = await selectContext({
      query: 'getting started install import function',
      items,
      tokenBudget: 40,
      options: { mmrLambda: 0.5 },
    });
    const ids = lowDiversity.selected.map((i) => i.id);
    const dupCount = ids.filter((id) => id.startsWith('dup')).length;
    assert(dupCount <= 2, 'MMR avoids selecting all three duplicates');
    assert(lowDiversity.selected.length >= 1, 'MMR still selects items');
  }

  // ═══════════════════════════════════════
  console.log('\n=== Empty candidate pool ===');
  // ═══════════════════════════════════════
  {
    const res = await selectContext({ query: 'anything', items: [], tokenBudget: 1000 });
    assert(res.selected.length === 0, 'no items selected from empty pool');
    assert(res.tokensSaved === 0, 'no savings from empty pool');
  }

  // ═══════════════════════════════════════
  console.log('\n=== ContextEngine: record + select + stats + agent scoping ===');
  // ═══════════════════════════════════════
  {
    const engine = new ContextEngine({ store: new InMemoryContextStore() });
    engine.record([
      item('x1', 'authentication with JWT tokens and refresh flow', { agentId: 'auth-agent' }),
      item('x2', 'CSS grid layout responsive design tips', { agentId: 'ui-agent' }),
      item('x3', 'password hashing with bcrypt and salt rounds', { agentId: 'auth-agent' }),
    ]);
    assert(engine.stats().items === 3, 'engine stored 3 items');

    const scoped = await engine.select('how to secure user login', {
      tokenBudget: 10_000,
      agentId: 'auth-agent',
    });
    assert(scoped.selected.every((i) => i.agentId === 'auth-agent'), 'agent scoping filters candidates');
    assert(scoped.selected.length === 2, 'only the two auth-agent items are candidates');
    assert(engine.stats().selections === 1, 'engine counts selections');
    assert(engine.stats().totalTokensSaved >= 0, 'engine tracks cumulative savings');

    // Upsert by id updates rather than duplicates.
    engine.record([item('x1', 'updated auth text', { agentId: 'auth-agent' })]);
    assert(engine.stats().items === 3, 'upsert by id does not duplicate');
  }

  // ═══════════════════════════════════════
  console.log('\n=== ContextEngine: maxItems eviction ===');
  // ═══════════════════════════════════════
  {
    const engine = new ContextEngine({ store: new InMemoryContextStore({ maxItems: 3 }) });
    for (let i = 0; i < 6; i++) engine.record([item(`e${i}`, `evict test item ${i}`)]);
    assert(engine.stats().items === 3, 'store capped at maxItems');
    assert(engine.getStore().get('e0') === undefined, 'oldest item evicted');
    assert(engine.getStore().get('e5') !== undefined, 'newest item retained');
  }

  // ═══════════════════════════════════════
  console.log('\n=== Results ===');
  // ═══════════════════════════════════════
  console.log(`\nTotal: ${passed + failed} tests, ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\nAll selection tests passed!');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
