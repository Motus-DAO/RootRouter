import type { ModelTier } from '../types';
import type { ModelCatalog, ModelCatalogNode, ResolveModelInput } from './types';
import { resolveFromCatalog, followCatalogEdge } from './catalogResolver';

/**
 * Curated OpenRouter model catalog for tier + capability routing.
 * IDs use OpenRouter provider/model format.
 */
export const OPENROUTER_CATALOG: ModelCatalog = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  nodes: [
    {
      id: 'openai/gpt-4o-mini',
      label: 'GPT-4o Mini',
      tier: 'fast',
      capabilities: ['chat'],
      contextWindow: 128_000,
      costPer1MInput: 0.15,
      costPer1MOutput: 0.6,
    },
    {
      id: 'anthropic/claude-haiku-4.5',
      label: 'Claude Haiku 4.5',
      tier: 'fast',
      capabilities: ['chat'],
      contextWindow: 200_000,
      costPer1MInput: 0.8,
      costPer1MOutput: 4.0,
      tierAnchor: true,
    },
    {
      id: 'anthropic/claude-sonnet-4.5',
      label: 'Claude Sonnet 4.5',
      tier: 'balanced',
      capabilities: ['chat', 'vision'],
      contextWindow: 200_000,
      costPer1MInput: 3.0,
      costPer1MOutput: 15.0,
      tierAnchor: true,
    },
    {
      id: 'openai/gpt-4o',
      label: 'GPT-4o',
      tier: 'balanced',
      capabilities: ['chat', 'vision'],
      contextWindow: 128_000,
      costPer1MInput: 2.5,
      costPer1MOutput: 10.0,
      specialty: 'vision',
    },
    {
      id: 'x-ai/grok-3-mini',
      label: 'Grok 3 Mini',
      tier: 'balanced',
      capabilities: ['chat', 'code'],
      contextWindow: 131_072,
      costPer1MInput: 0.3,
      costPer1MOutput: 0.5,
      specialty: 'code',
    },
    {
      id: 'openai/o3-mini',
      label: 'o3 Mini',
      tier: 'powerful',
      capabilities: ['chat', 'reasoning'],
      contextWindow: 200_000,
      costPer1MInput: 1.1,
      costPer1MOutput: 4.4,
      specialty: 'reasoning',
    },
    {
      id: 'anthropic/claude-opus-4.6',
      label: 'Claude Opus 4.6',
      tier: 'powerful',
      capabilities: ['chat', 'reasoning', 'long-context'],
      contextWindow: 200_000,
      costPer1MInput: 15.0,
      costPer1MOutput: 75.0,
      tierAnchor: true,
    },
    {
      id: 'google/gemini-2.5-pro-preview',
      label: 'Gemini 2.5 Pro',
      tier: 'powerful',
      capabilities: ['chat', 'long-context', 'vision'],
      contextWindow: 1_048_576,
      costPer1MInput: 1.25,
      costPer1MOutput: 10.0,
      specialty: 'long-context',
    },
    {
      id: 'openai/text-embedding-3-small',
      label: 'text-embedding-3-small',
      tier: 'fast',
      capabilities: ['embedding'],
      contextWindow: 8_192,
      costPer1MInput: 0.02,
      costPer1MOutput: 0.0,
      specialty: 'embedding',
    },
  ],
  edges: [
    { from: 'openai/gpt-4o-mini', to: 'anthropic/claude-sonnet-4.5', kind: 'upgrade', when: 'chamber medium difficulty' },
    { from: 'anthropic/claude-haiku-4.5', to: 'anthropic/claude-sonnet-4.5', kind: 'upgrade', when: 'chamber medium difficulty' },
    { from: 'anthropic/claude-haiku-4.5', to: 'x-ai/grok-3-mini', kind: 'specialize', when: 'code-heavy task' },
    { from: 'anthropic/claude-sonnet-4.5', to: 'openai/o3-mini', kind: 'specialize', when: 'reasoning task' },
    { from: 'anthropic/claude-sonnet-4.5', to: 'openai/gpt-4o', kind: 'specialize', when: 'vision input detected' },
    { from: 'anthropic/claude-sonnet-4.5', to: 'anthropic/claude-opus-4.6', kind: 'upgrade', when: 'chamber hard' },
    { from: 'x-ai/grok-3-mini', to: 'anthropic/claude-opus-4.6', kind: 'upgrade', when: 'chamber hard' },
    { from: 'openai/o3-mini', to: 'anthropic/claude-opus-4.6', kind: 'upgrade', when: 'frontier quality' },
    { from: 'anthropic/claude-opus-4.6', to: 'google/gemini-2.5-pro-preview', kind: 'specialize', when: 'long context' },
    { from: 'anthropic/claude-opus-4.6', to: 'anthropic/claude-haiku-4.5', kind: 'downgrade', when: 'safe mode / cost cap' },
  ],
};

export const OPENROUTER_TIER_DEFAULTS: Record<ModelTier, string> = {
  fast: 'anthropic/claude-haiku-4.5',
  balanced: 'anthropic/claude-sonnet-4.5',
  powerful: 'anthropic/claude-opus-4.6',
};

export function resolveOpenRouterModel(input: ResolveModelInput): ModelCatalogNode {
  return resolveFromCatalog(OPENROUTER_CATALOG, OPENROUTER_TIER_DEFAULTS, input);
}

export function followOpenRouterEdge(
  fromModelId: string,
  kind: 'upgrade' | 'downgrade' | 'specialize'
): ModelCatalogNode | null {
  return followCatalogEdge(OPENROUTER_CATALOG, fromModelId, kind);
}
