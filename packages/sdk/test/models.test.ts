import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config';
import {
  resolveVeniceModel,
  resolveOpenRouterModel,
  VENICE_TIER_DEFAULTS,
  OPENROUTER_TIER_DEFAULTS,
  followVeniceEdge,
  followOpenRouterEdge,
  detectCapabilities,
  inferCatalogFromBaseUrl,
  resolveModelForRouting,
  resolveActiveCatalogId,
} from '../src/models';
import type { RouterConfig } from '../src/types';

describe('resolveVeniceModel', () => {
  it('returns tier defaults for plain chat', () => {
    assert.equal(resolveVeniceModel({ tier: 'fast' }).id, VENICE_TIER_DEFAULTS.fast);
    assert.equal(resolveVeniceModel({ tier: 'balanced' }).id, VENICE_TIER_DEFAULTS.balanced);
    assert.equal(resolveVeniceModel({ tier: 'powerful' }).id, VENICE_TIER_DEFAULTS.powerful);
  });

  it('branches to vision model when capability hint set', () => {
    const m = resolveVeniceModel({ tier: 'fast', capabilities: ['vision'] });
    assert.equal(m.id, 'qwen3-vl-235b-a22b');
    assert.ok(m.capabilities.includes('vision'));
  });

  it('follows upgrade edge in catalog graph', () => {
    const next = followVeniceEdge('qwen3-4b', 'upgrade');
    assert.equal(next?.id, 'mistral-31-24b');
  });
});

describe('resolveOpenRouterModel', () => {
  it('returns tier defaults for plain chat', () => {
    assert.equal(resolveOpenRouterModel({ tier: 'fast' }).id, OPENROUTER_TIER_DEFAULTS.fast);
    assert.equal(resolveOpenRouterModel({ tier: 'balanced' }).id, OPENROUTER_TIER_DEFAULTS.balanced);
    assert.equal(resolveOpenRouterModel({ tier: 'powerful' }).id, OPENROUTER_TIER_DEFAULTS.powerful);
  });

  it('branches to vision specialty', () => {
    const m = resolveOpenRouterModel({ tier: 'fast', capabilities: ['vision'] });
    assert.equal(m.id, 'openai/gpt-4o');
  });

  it('follows code specialize edge from haiku', () => {
    const next = followOpenRouterEdge('anthropic/claude-haiku-4.5', 'specialize');
    assert.equal(next?.id, 'x-ai/grok-3-mini');
  });
});

describe('detectCapabilities', () => {
  it('detects vision from multimodal content', () => {
    const caps = detectCapabilities([
      {
        role: 'user',
        content: [{ type: 'image_url', image_url: { url: 'https://example.com/a.png' } }],
      },
    ]);
    assert.ok(caps.includes('vision'));
  });

  it('detects code from keywords', () => {
    const caps = detectCapabilities([
      { role: 'user', content: 'Please refactor this TypeScript function and fix the bug' },
    ]);
    assert.ok(caps.includes('code'));
  });

  it('detects reasoning from keywords', () => {
    const caps = detectCapabilities([
      { role: 'user', content: 'Analyze step by step why this theorem holds' },
    ]);
    assert.ok(caps.includes('reasoning'));
  });

  it('detects long-context from token estimate', () => {
    const caps = detectCapabilities([{ role: 'user', content: 'summarize' }], 25_000);
    assert.ok(caps.includes('long-context'));
  });
});

describe('registry', () => {
  it('infers catalog from base URL', () => {
    assert.equal(inferCatalogFromBaseUrl('https://api.venice.ai/api/v1'), 'venice');
    assert.equal(inferCatalogFromBaseUrl('https://openrouter.ai/api/v1'), 'openrouter');
    assert.equal(inferCatalogFromBaseUrl('https://api.openai.com/v1'), null);
  });

  it('resolveActiveCatalogId returns null when off', () => {
    const config: RouterConfig = {
      ...loadConfig(),
      modelCatalog: 'off',
      llmBaseUrl: 'https://openrouter.ai/api/v1',
    };
    assert.equal(resolveActiveCatalogId(config), null);
  });

  it('resolveActiveCatalogId auto-infers venice', () => {
    const config: RouterConfig = {
      ...loadConfig(),
      modelCatalog: 'auto',
      llmBaseUrl: 'https://api.venice.ai/api/v1',
    };
    assert.equal(resolveActiveCatalogId(config), 'venice');
  });

  it('resolveModelForRouting returns null when catalog off', () => {
    const config: RouterConfig = { ...loadConfig(), modelCatalog: 'off' };
    assert.equal(
      resolveModelForRouting(config, { tier: 'balanced', capabilities: ['chat'] }),
      null
    );
  });

  it('resolveModelForRouting uses catalog when venice enabled', () => {
    const config: RouterConfig = {
      ...loadConfig(),
      modelCatalog: 'venice',
      venicePrivacy: 'private',
      modelTierOverrides: {},
    };
    const result = resolveModelForRouting(config, {
      tier: 'balanced',
      capabilities: ['vision'],
    });
    assert.ok(result);
    assert.equal(result!.catalogId, 'venice');
    assert.equal(result!.modelId, 'qwen3-vl-235b-a22b');
    assert.equal(result!.fromOverride, false);
  });

  it('per-tier env override wins over catalog', () => {
    const config: RouterConfig = {
      ...loadConfig(),
      modelCatalog: 'venice',
      models: {
        ...loadConfig().models,
        fast: 'my-custom-fast-model',
      },
      modelTierOverrides: { fast: true },
    };
    const result = resolveModelForRouting(config, {
      tier: 'fast',
      capabilities: ['chat'],
    });
    assert.ok(result);
    assert.equal(result!.modelId, 'my-custom-fast-model');
    assert.equal(result!.fromOverride, true);
  });
});
