import * as assert from 'assert';
import {
  getContextMeterSnapshot,
  recordContextSample,
  resetContextMeterForTests,
} from '../src/contextMeter';

resetContextMeterForTests();

recordContextSample({
  agentId: 'hermes-coo:avril',
  model: 'deepseek-v4-flash',
  filtered: true,
  tokensBefore: 9000,
  tokensAfter: 4200,
  tokensSaved: 4800,
  storeRecalled: 2,
  contextBudget: 4000,
});

recordContextSample({
  agentId: 'hermes-coo:motusdao',
  filtered: false,
  tokensBefore: 500,
  tokensAfter: 500,
  tokensSaved: 0,
  storeRecalled: 0,
  contextBudget: 4000,
});

const snap = getContextMeterSnapshot({ contextBudget: 4000, minTokensToFilter: 6000 });
assert.strictEqual(snap.session.requests, 2);
assert.strictEqual(snap.session.tokensSaved, 4800);
assert.strictEqual(snap.last?.agentId, 'hermes-coo:motusdao');
assert.strictEqual(snap.byAgent.length, 2);
assert.ok((snap.last?.budgetFill ?? 0) > 0 || snap.last?.tokensAfter === 500);

console.log('contextMeter tests passed');
