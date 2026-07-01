import type { ModelTier, RouterConfig } from '../types';
import type { ModelCapability, ModelCatalog, PrivacyMode, ResolveModelInput } from './types';
import { resolveFromCatalog } from './catalogResolver';
import { OPENROUTER_CATALOG, OPENROUTER_TIER_DEFAULTS } from './openRouterCatalog';
import { VENICE_CATALOG, VENICE_TIER_DEFAULTS } from './veniceCatalog';

export type ModelCatalogId = 'venice' | 'openrouter';

const CATALOGS: Record<ModelCatalogId, ModelCatalog> = {
  venice: VENICE_CATALOG,
  openrouter: OPENROUTER_CATALOG,
};

const TIER_DEFAULTS: Record<ModelCatalogId, Record<ModelTier, string>> = {
  venice: VENICE_TIER_DEFAULTS,
  openrouter: OPENROUTER_TIER_DEFAULTS,
};

export function getCatalogById(id: ModelCatalogId): ModelCatalog {
  return CATALOGS[id];
}

export function getTierDefaults(id: ModelCatalogId): Record<ModelTier, string> {
  return TIER_DEFAULTS[id];
}

/** Detect provider catalog from LLM base URL hostname. */
export function inferCatalogFromBaseUrl(llmBaseUrl: string): ModelCatalogId | null {
  try {
    const host = new URL(llmBaseUrl).hostname.toLowerCase();
    if (host.includes('venice.ai')) return 'venice';
    if (host.includes('openrouter.ai')) return 'openrouter';
  } catch {
    // invalid URL
  }
  return null;
}

/**
 * Resolve active catalog id from config.
 * - `off` / empty → null (legacy config.models.* only)
 * - `auto` → infer from llmBaseUrl
 * - `venice` | `openrouter` → explicit
 */
export function resolveActiveCatalogId(config: RouterConfig): ModelCatalogId | null {
  const mode = config.modelCatalog ?? 'off';
  if (mode === 'off') return null;
  if (mode === 'auto') return inferCatalogFromBaseUrl(config.llmBaseUrl);
  return mode;
}

export interface ResolveModelForRoutingInput {
  tier: ModelTier;
  capabilities: ModelCapability[];
}

/**
 * Pick model id using catalog graph + per-tier env overrides.
 * Returns null when catalog routing is disabled.
 */
export function resolveModelForRouting(
  config: RouterConfig,
  input: ResolveModelForRoutingInput
): { modelId: string; catalogId: ModelCatalogId; fromOverride: boolean } | null {
  const catalogId = resolveActiveCatalogId(config);
  if (!catalogId) return null;

  const tierOverride = config.models[input.tier];
  const hasExplicitOverride = config.modelTierOverrides?.[input.tier] === true;

  if (hasExplicitOverride && tierOverride) {
    return { modelId: tierOverride, catalogId, fromOverride: true };
  }

  const catalog = getCatalogById(catalogId);
  const tierDefaults = getTierDefaults(catalogId);
  const privacy: PrivacyMode | undefined =
    catalogId === 'venice' ? (config.venicePrivacy ?? 'private') : undefined;

  const resolveInput: ResolveModelInput = {
    tier: input.tier,
    capabilities: input.capabilities,
    privacy,
  };

  const node = resolveFromCatalog(catalog, tierDefaults, resolveInput);
  return { modelId: node.id, catalogId, fromOverride: false };
}
