import type { ModelTier } from '../types';
import type { ModelCatalog, ModelCatalogNode, ResolveModelInput } from './types';

function nodeMap(catalog: ModelCatalog): Map<string, ModelCatalogNode> {
  return new Map(catalog.nodes.map((n) => [n.id, n]));
}

function pickBest(
  candidates: ModelCatalogNode[],
  privacy?: ResolveModelInput['privacy'],
  preferCheaper = true
): ModelCatalogNode | undefined {
  let pool = candidates;
  if (privacy) {
    const filtered = pool.filter((n) => n.privacy === privacy);
    if (filtered.length > 0) pool = filtered;
  }
  if (pool.length === 0) return undefined;
  if (!preferCheaper) return pool[0];
  return [...pool].sort(
    (a, b) => a.costPer1MInput + a.costPer1MOutput - (b.costPer1MInput + b.costPer1MOutput)
  )[0];
}

/**
 * Resolve a model from any provider catalog using difficulty tier + capability hints.
 */
export function resolveFromCatalog(
  catalog: ModelCatalog,
  tierDefaults: Record<ModelTier, string>,
  input: ResolveModelInput
): ModelCatalogNode {
  const { tier, capabilities = [], privacy, preferCheaper = true } = input;
  const byId = nodeMap(catalog);

  for (const cap of capabilities) {
    if (cap === 'chat') continue;
    const specialty = pickBest(
      catalog.nodes.filter((n) => n.specialty === cap),
      privacy,
      preferCheaper
    );
    if (specialty) return specialty;
  }

  const tierCandidates = catalog.nodes.filter((n) => n.tier === tier && n.tierAnchor);
  const picked = pickBest(tierCandidates, privacy, preferCheaper);
  if (picked) return picked;

  const fallbackId = tierDefaults[tier];
  const fallback = byId.get(fallbackId);
  if (!fallback) {
    throw new Error(`${catalog.provider} catalog missing default for tier ${tier}`);
  }
  return fallback;
}

/** Walk one graph edge from a model id (upgrade / specialize / downgrade). */
export function followCatalogEdge(
  catalog: ModelCatalog,
  fromModelId: string,
  kind: 'upgrade' | 'downgrade' | 'specialize'
): ModelCatalogNode | null {
  const edge = catalog.edges.find((e) => e.from === fromModelId && e.kind === kind);
  if (!edge) return null;
  return nodeMap(catalog).get(edge.to) ?? null;
}
