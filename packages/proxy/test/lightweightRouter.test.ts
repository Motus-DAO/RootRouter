/**
 * Unit tests for lightweight proxy model routing.
 * Run: tsx test/lightweightRouter.test.ts
 */
import {
  applyLightweightModelRouting,
  estimateTierLightweight,
  resetAgentStatsForTests,
} from '../src/lightweightRouter.js';
import { getProxyRoutingConfig, resetProxyRoutingConfigCache } from '../src/routingConfig.js';
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

function shortUser(text: string): ChatMessage[] {
  return [{ role: 'user', content: text }];
}

async function main() {
  resetAgentStatsForTests();
  resetProxyRoutingConfigCache();

  console.log('\n=== Tier heuristics ===');
  {
    resetAgentStatsForTests();
    const tier = estimateTierLightweight(shortUser('hi'), 'a1', 500);
    assert(tier === 'fast', 'short low-token query → fast');
  }
  {
    resetAgentStatsForTests();
    const tier = estimateTierLightweight(
      shortUser('Please refactor this TypeScript module and fix the integration test bug'),
      'a2',
      8_000
    );
    assert(tier === 'powerful', 'code + high tokens → powerful');
  }
  {
    resetAgentStatsForTests();
    const tier = estimateTierLightweight(
      [
        {
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: 'https://example.com/x.png' } }],
        },
      ],
      'a3',
      2_000
    );
    assert(tier === 'balanced', 'vision without huge context → balanced');
  }

  console.log('\n=== Catalog routing (venice) ===');
  {
    resetAgentStatsForTests();
    const prev = process.env.MODEL_CATALOG;
    process.env.MODEL_CATALOG = 'venice';
    resetProxyRoutingConfigCache();
    const config = getProxyRoutingConfig('https://api.venice.ai');
    const longReasoning = `analyze step by step why this fails. ${'context '.repeat(800)}`;
    const result = applyLightweightModelRouting({
      messages: [{ role: 'user', content: longReasoning }],
      agentId: 'venice-1',
      config,
    });
    assert(!!result?.applied, 'routing applied');
    assert(result!.tier === 'powerful', 'reasoning + large context → powerful');
    assert(result!.modelId.length > 0, 'model id resolved');
    if (prev === undefined) delete process.env.MODEL_CATALOG;
    else process.env.MODEL_CATALOG = prev;
    resetProxyRoutingConfigCache();
  }

  console.log('\n=== Force model opt-out ===');
  {
    resetAgentStatsForTests();
    const config = getProxyRoutingConfig('https://openrouter.ai');
    const result = applyLightweightModelRouting({
      messages: shortUser('hi'),
      agentId: 'force-1',
      config,
      forceModel: true,
    });
    assert(result === null, 'forceModel skips routing rewrite');
  }

  console.log('\n=== Legacy MODEL_* when catalog off ===');
  {
    resetAgentStatsForTests();
    const prev = process.env.MODEL_CATALOG;
    process.env.MODEL_CATALOG = 'off';
    resetProxyRoutingConfigCache();
    const config = getProxyRoutingConfig('https://openrouter.ai');
    const result = applyLightweightModelRouting({
      messages: shortUser('hello there'),
      agentId: 'legacy-1',
      config,
    });
    assert(result?.modelId === config.models[result!.tier], 'uses config.models[tier] when catalog off');
    if (prev === undefined) delete process.env.MODEL_CATALOG;
    else process.env.MODEL_CATALOG = prev;
    resetProxyRoutingConfigCache();
  }

  console.log(`\n=== Results ===\n\nTotal: ${passed + failed} tests, ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
  console.log('All lightweight router tests passed!\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
