/**
 * Unit tests for Hermes config YAML patcher (init hermes).
 */
import * as assert from 'assert';
import { patchHermesConfigYaml } from '../src/cli/initHermes';
import { scopedProxyAgentId } from '../src/cli/runtimeStores';

function testScopedIds(): void {
  assert.strictEqual(scopedProxyAgentId('hermes-coo', 'Brahma101'), 'hermes-coo:brahma101');
  assert.strictEqual(scopedProxyAgentId('hermes-coo', null), 'hermes-coo:default');
  assert.strictEqual(scopedProxyAgentId('openclaw-shamy', 'MotusDAO'), 'openclaw-shamy:motusdao');
}

function testPatchHermes(): void {
  const before = `model:
  default: deepseek-v4-flash
  provider: venice
  base_url: https://api.venice.ai/api/v1
  key_env: VENICE_API_KEY
providers:
  venice:
    name: Venice
    base_url: https://api.venice.ai/api/v1
  rootrouter:
    name: RootRouter Proxy
    base_url: http://127.0.0.1:8787/api/v1
    api: http://127.0.0.1:8787/api/v1
    key_env: VENICE_API_KEY
    enabled: true
    discover_models: false
database:
  journal_mode: wal
`;

  const after = patchHermesConfigYaml(before, {
    proxyBaseUrl: 'http://127.0.0.1:8787/api/v1',
    agentId: 'hermes-coo:brahma101',
    setDefaultProvider: true,
  });

  assert.match(after, /provider: rootrouter/);
  assert.match(after, /base_url: http:\/\/127\.0\.0\.1:8787\/api\/v1/);
  assert.match(after, /x-rootrouter-agent-id: "hermes-coo:brahma101"/);
  assert.doesNotMatch(after, /^\s+enabled:/m);
  assert.match(after, /journal_mode: wal/);
}

testScopedIds();
testPatchHermes();
console.log('initHermes tests passed');
