/**
 * Hermes auto agentId resolution tests.
 */
import * as assert from 'assert';
import {
  clearHermesAgentIdCache,
  resolveProxyAgentId,
} from '../src/hermesAgentId';

process.env.ROOTROUTER_HERMES_AUTO_PROJECT = 'false';
clearHermesAgentIdCache();

{
  const r = resolveProxyAgentId({ headerAgentId: 'hermes-coo:brahma101' });
  assert.strictEqual(r.agentId, 'hermes-coo:brahma101');
  assert.strictEqual(r.source, 'header');
}

process.env.ROOTROUTER_HERMES_AUTO_PROJECT = 'true';
clearHermesAgentIdCache();

{
  // With auto on, stale header is ignored in favor of Hermes active (or default).
  const r = resolveProxyAgentId({
    headerAgentId: 'hermes-coo:brahma101',
    lockHeader: true,
  });
  assert.strictEqual(r.agentId, 'hermes-coo:brahma101');
  assert.strictEqual(r.source, 'header');
}

{
  const r = resolveProxyAgentId({ headerAgentId: 'stale' });
  assert.ok(r.agentId.startsWith('hermes-coo:'));
  assert.ok(r.source === 'hermes-active' || r.source === 'hermes-default');
  console.log('resolved', r);
}

console.log('hermesAgentId tests passed');
