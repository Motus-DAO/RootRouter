import type { ModelTier } from '../types';
import type { ModelCatalog } from './types';
import { resolveFromCatalog, followCatalogEdge } from './catalogResolver';
import type { ModelCatalogNode, ResolveModelInput } from './types';

/**
 * Curated Venice model catalog for tier + capability routing.
 * IDs from https://docs.venice.ai — refresh via GET https://api.venice.ai/api/v1/models
 */
export const VENICE_CATALOG: ModelCatalog = {
  provider: 'venice',
  baseUrl: 'https://api.venice.ai/api/v1',
  nodes: [
    {
      id: 'qwen3-4b',
      label: 'Qwen3 4B',
      tier: 'fast',
      capabilities: ['chat'],
      contextWindow: 32_000,
      costPer1MInput: 0.05,
      costPer1MOutput: 0.15,
      privacy: 'private',
      tierAnchor: true,
    },
    {
      id: 'mistral-31-24b',
      label: 'Mistral 3.1 24B',
      tier: 'balanced',
      capabilities: ['chat', 'vision'],
      contextWindow: 128_000,
      costPer1MInput: 0.5,
      costPer1MOutput: 2.0,
      privacy: 'private',
      tierAnchor: true,
    },
    {
      id: 'zai-org-glm-4.7',
      label: 'GLM 4.7',
      tier: 'balanced',
      capabilities: ['chat', 'code'],
      contextWindow: 128_000,
      costPer1MInput: 0.55,
      costPer1MOutput: 2.65,
      privacy: 'private',
      specialty: 'code',
    },
    {
      id: 'qwen3-235b-a22b-thinking-2507',
      label: 'Qwen3 235B Thinking',
      tier: 'powerful',
      capabilities: ['chat', 'reasoning'],
      contextWindow: 128_000,
      costPer1MInput: 0.45,
      costPer1MOutput: 3.5,
      privacy: 'private',
      tierAnchor: true,
      specialty: 'reasoning',
    },
    {
      id: 'openai-gpt-55',
      label: 'GPT 5.5 (anonymized)',
      tier: 'powerful',
      capabilities: ['chat', 'reasoning', 'long-context'],
      contextWindow: 1_000_000,
      costPer1MInput: 2.19,
      costPer1MOutput: 17.5,
      privacy: 'anonymized',
      specialty: 'long-context',
    },
    {
      id: 'qwen3-vl-235b-a22b',
      label: 'Qwen3 VL 235B',
      tier: 'powerful',
      capabilities: ['chat', 'vision'],
      contextWindow: 128_000,
      costPer1MInput: 0.5,
      costPer1MOutput: 2.0,
      privacy: 'private',
      specialty: 'vision',
    },
    {
      id: 'text-embedding-bge-m3',
      label: 'BGE-M3 Embeddings',
      tier: 'fast',
      capabilities: ['embedding'],
      contextWindow: 8_192,
      costPer1MInput: 0.15,
      costPer1MOutput: 0.6,
      privacy: 'private',
      specialty: 'embedding',
    },
  ],
  edges: [
    { from: 'qwen3-4b', to: 'mistral-31-24b', kind: 'upgrade', when: 'chamber medium difficulty' },
    { from: 'qwen3-4b', to: 'zai-org-glm-4.7', kind: 'specialize', when: 'code-heavy task' },
    { from: 'mistral-31-24b', to: 'qwen3-235b-a22b-thinking-2507', kind: 'upgrade', when: 'chamber hard / reasoning' },
    { from: 'mistral-31-24b', to: 'qwen3-vl-235b-a22b', kind: 'specialize', when: 'vision input detected' },
    { from: 'zai-org-glm-4.7', to: 'qwen3-235b-a22b-thinking-2507', kind: 'upgrade', when: 'chamber hard' },
    { from: 'qwen3-235b-a22b-thinking-2507', to: 'openai-gpt-55', kind: 'upgrade', when: 'long context or frontier quality' },
    { from: 'openai-gpt-55', to: 'mistral-31-24b', kind: 'downgrade', when: 'safe mode / cost cap' },
  ],
};

/** Default tier → model mapping for .env / quick start. */
export const VENICE_TIER_DEFAULTS: Record<ModelTier, string> = {
  fast: 'qwen3-4b',
  balanced: 'mistral-31-24b',
  powerful: 'qwen3-235b-a22b-thinking-2507',
};

export function resolveVeniceModel(input: ResolveModelInput): ModelCatalogNode {
  return resolveFromCatalog(VENICE_CATALOG, VENICE_TIER_DEFAULTS, input);
}

export function followVeniceEdge(
  fromModelId: string,
  kind: 'upgrade' | 'downgrade' | 'specialize'
): ModelCatalogNode | null {
  return followCatalogEdge(VENICE_CATALOG, fromModelId, kind);
}
