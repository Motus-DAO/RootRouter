/**
 * Stateful proxy filter tests (ContextEngine + cross-request recall).
 * Run: tsx test/stateful.test.ts
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { ContextEngine, InMemoryContextStore, FileContextStore } from 'rootrouter';
import { filterMessages } from '../src/filter.js';
import type { ChatMessage } from '../src/filter.js';

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string): void {
  if (cond) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name}`);
  }
}

function long(s: string): string {
  return (s + ' ').repeat(8).trim();
}

async function main() {
  console.log('\n=== Stateful: short request recalls prior session from store ===');
  {
    const engine = new ContextEngine({ store: new InMemoryContextStore() });
    const agentId = 'test-agent';

    // Request 1 — record a long sorting conversation.
    const session1: ChatMessage[] = [
      { role: 'system', content: long('system rules') },
      { role: 'user', content: long('explain quicksort pivot selection and partition steps') },
      { role: 'assistant', content: long('quicksort picks a pivot and partitions the array into smaller and larger elements') },
      { role: 'user', content: long('chocolate chip cookie recipe with butter and brown sugar') },
      { role: 'assistant', content: long('cream butter and sugar then add chocolate chips and bake') },
      { role: 'user', content: 'help me implement sorting in code' },
    ];

    await filterMessages(session1, {
      contextBudget: 80,
      minTokensToFilter: 50,
      mmrLambda: 1,
      engine,
      agentId,
      storeShare: 0.5,
    });

    // Request 2 — only the new query; should pull sorting context from store.
    const session2: ChatMessage[] = [
      { role: 'system', content: long('system rules') },
      { role: 'user', content: 'continue implementing the sorting algorithm' },
    ];

    const out = await filterMessages(session2, {
      contextBudget: 120,
      minTokensToFilter: 50,
      mmrLambda: 1,
      engine,
      agentId,
      storeShare: 0.8,
    });

    const text = out.messages.map((m) => String(m.content)).join(' ');
    assert(out.storeRecalled !== undefined && out.storeRecalled > 0, 'recalled items from store');
    assert(text.includes('quicksort') || text.includes('Quicksort') || text.includes('partition'), 'recalled sorting-related turn');
    assert(!text.includes('chocolate') && !text.includes('cookie'), 'did not recall irrelevant cookie turn');
  }

  console.log('\n=== Stateful: agent id isolation ===');
  {
    const engine = new ContextEngine({ store: new InMemoryContextStore() });

    await filterMessages(
      [{ role: 'user', content: long('agent A secret topic alpha bravo charlie delta') }],
      { contextBudget: 500, minTokensToFilter: 10, engine, agentId: 'agent-a', storeShare: 1 }
    );

    const out = await filterMessages(
      [{ role: 'user', content: 'tell me about alpha bravo' }],
      { contextBudget: 500, minTokensToFilter: 10, engine, agentId: 'agent-b', storeShare: 1 }
    );

    const text = out.messages.map((m) => String(m.content)).join(' ');
    assert(!text.includes('agent A secret'), 'agent-b does not see agent-a store');
    assert((out.storeRecalled ?? 0) === 0, 'no store recall for isolated agent');
  }

  console.log('\n=== Stateful: below threshold still records (no trim) ===');
  {
    const storePath = path.join(os.tmpdir(), `rr-stateful-${Date.now()}.json`);
    const engine = new ContextEngine({
      store: new FileContextStore({ filePath: storePath }),
    });
    await engine.load();

    await filterMessages(
      [{ role: 'user', content: 'short' }],
      { contextBudget: 100, minTokensToFilter: 100000, engine, agentId: 'persist-test' }
    );
    await engine.save();

    const engine2 = new ContextEngine({
      store: new FileContextStore({ filePath: storePath }),
    });
    await engine2.load();
    assert(engine2.stats().items >= 1, 'recorded turn even when below trim threshold');

    try {
      fs.unlinkSync(storePath);
    } catch {
      /* ignore */
    }
  }

  console.log('\n=== Results ===');
  console.log(`\nTotal: ${passed + failed} tests, ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  else console.log('\nAll stateful filter tests passed!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
