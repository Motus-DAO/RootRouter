import { Vector } from '../types';
import { cosineSimilarity, estimateTokens } from '../math/vectors';
import { StructuredVectorSpace } from '../core/vectorSpace';
import {
  ContextItem,
  EmbeddingProvider,
  ItemScore,
  SelectionOptions,
  SelectionResult,
} from './types';
import {
  annPrefilterCandidates,
  DEFAULT_ANN_PREFETCH_K,
  DEFAULT_ANN_THRESHOLD,
} from './ann/hnswIndex';
import { filterCandidatesByPath, itemPath } from './pathFilter';
import { pathMentionedInSpec } from '../spec/buildQueryFromSpec';

const DEFAULT_MMR_LAMBDA = 0.7;
const DEFAULT_CHAMBER_BOOST = 0.15;
const DEFAULT_GRAPH_BOOST = 0.12;
const DEFAULT_GRAPH_SEED_K = 3;
const DEFAULT_HUB_BOOST = 0.05;
const DEFAULT_MAX_PER_COMMUNITY = 2;
const DEFAULT_WINDOW_SIZE = 20;
const DEFAULT_SPEC_BOOST = 0.12;

interface ScoredCandidate {
  item: ContextItem;
  vector: Vector;
  tokens: number;
  relevance: number;
  recency: number;
  chamber: number;
  graph: number;
  base: number;
}

export class ContextSelector {
  private provider: EmbeddingProvider;

  constructor(provider: EmbeddingProvider) {
    this.provider = provider;
  }

  async select(
    query: string,
    candidates: ContextItem[],
    options: SelectionOptions,
    vectorSpace?: StructuredVectorSpace | null
  ): Promise<SelectionResult> {
    const mmrLambda = clamp(options.mmrLambda ?? DEFAULT_MMR_LAMBDA, 0, 1);
    const recencyBoost = options.recencyBoost ?? 0;
    const chamberBoost = options.chamberBoost ?? DEFAULT_CHAMBER_BOOST;
    const baseline = options.baseline ?? 'all';
    const windowSize = options.windowSize ?? DEFAULT_WINDOW_SIZE;
    const hubBoost = options.hubBoost ?? DEFAULT_HUB_BOOST;
    const graphSeedK = options.graphSeedK ?? DEFAULT_GRAPH_SEED_K;
    const maxPerCommunity = options.maxPerCommunity ?? DEFAULT_MAX_PER_COMMUNITY;
    const annThreshold = options.annThreshold ?? DEFAULT_ANN_THRESHOLD;
    const annPrefetchK = options.annPrefetchK ?? DEFAULT_ANN_PREFETCH_K;

    const hasGraphNodes = candidates.some(
      (c) => Array.isArray(c.metadata?.edges) && (c.metadata!.edges as string[]).length > 0
    );
    const graphBoost =
      options.graphBoost !== undefined
        ? options.graphBoost
        : hasGraphNodes
          ? DEFAULT_GRAPH_BOOST
          : 0;

    if (candidates.length === 0) return emptyResult();

    const { filtered: pathScoped, pathFiltered } = filterCandidatesByPath(
      candidates,
      options.pathPrefix,
      options.excludePaths
    );
    if (pathScoped.length === 0) {
      return emptyResult('No candidates remain after path filter.');
    }

    const queryVector = await this.provider.embed(query);
    const { pool, annPrefilteredFrom } = await this.prepareCandidatePool(
      pathScoped,
      queryVector,
      annThreshold,
      annPrefetchK
    );

    let scored = await this.scoreCandidates(
      pool,
      queryVector,
      recencyBoost,
      chamberBoost,
      vectorSpace ?? null
    );

    const graphBoostedCount = applyGraphBoost(scored, pool, {
      graphBoost,
      graphSeedK,
      hubBoost,
    });

    const specBoostedCount = applySpecBoost(scored, options);

    const { selected, scores, chamberBoosted } = this.runMmr(
      scored,
      mmrLambda,
      options.tokenBudget,
      maxPerCommunity
    );

    const tokensOut = selected.reduce((s, c) => s + c.tokens, 0);
    const tokensIn = computeBaselineTokens(scored, baseline, windowSize);
    const tokensSaved = Math.max(0, tokensIn - tokensOut);
    const percentSaved = tokensIn > 0 ? (tokensSaved / tokensIn) * 100 : 0;
    const selectedIds = new Set(selected.map((c) => c.item.id));
    const droppedIds = scored.filter((c) => !selectedIds.has(c.item.id)).map((c) => c.item.id);

    return {
      selected: selected.map((c) => c.item),
      scores,
      tokensIn,
      tokensOut,
      tokensSaved,
      percentSaved,
      reasoning: buildReasoning({
        candidates: scored.length,
        selected: selected.length,
        tokenBudget: options.tokenBudget,
        tokensOut,
        percentSaved,
        chamberBoosted,
        graphBoosted: graphBoostedCount,
        mmrLambda,
        annPrefilteredFrom,
        pathFiltered,
        specBoosted: specBoostedCount,
      }),
      breakdown: {
        candidates: scored.length,
        selected: selected.length,
        droppedByBudget: scored.length - selected.length,
        chamberBoosted,
        graphBoosted: graphBoostedCount,
        ...(annPrefilteredFrom !== undefined ? { annPrefilteredFrom } : {}),
        ...(pathFiltered > 0 ? { pathFiltered } : {}),
        ...(specBoostedCount > 0 ? { specBoosted: specBoostedCount } : {}),
      },
      droppedIds,
    };
  }

  /** Embed all candidates; optionally ANN-prefilter when the pool is large. */
  private async prepareCandidatePool(
    candidates: ContextItem[],
    queryVector: Vector,
    annThreshold: number,
    annPrefetchK: number
  ): Promise<{ pool: ContextItem[]; annPrefilteredFrom?: number }> {
    if (annThreshold <= 0 || candidates.length <= annThreshold) {
      return { pool: candidates };
    }

    const missingIdx: number[] = [];
    const toEmbed: string[] = [];
    candidates.forEach((item, i) => {
      if (!item.vector || item.vector.length === 0) {
        missingIdx.push(i);
        toEmbed.push(item.text);
      }
    });
    let embedded: Vector[] = [];
    if (toEmbed.length > 0) embedded = await this.provider.embedBatch(toEmbed);

    const vectors: Vector[] = candidates.map((c) => c.vector ?? []);
    missingIdx.forEach((idx, k) => {
      vectors[idx] = embedded[k] ?? [];
    });

    const withVectors = candidates.map((c, i) => ({ id: c.id, vector: vectors[i] }));
    const keepIds = annPrefilterCandidates(queryVector, withVectors, annThreshold, annPrefetchK);
    if (!keepIds) return { pool: candidates };

    const pool = candidates.filter((c) => keepIds.has(c.id));
    return { pool, annPrefilteredFrom: candidates.length };
  }

  private async scoreCandidates(
    candidates: ContextItem[],
    queryVector: Vector,
    recencyBoost: number,
    chamberBoost: number,
    vectorSpace: StructuredVectorSpace | null
  ): Promise<ScoredCandidate[]> {
    const missingIdx: number[] = [];
    const toEmbed: string[] = [];
    candidates.forEach((item, i) => {
      if (!item.vector || item.vector.length === 0) {
        missingIdx.push(i);
        toEmbed.push(item.text);
      }
    });
    let embedded: Vector[] = [];
    if (toEmbed.length > 0) embedded = await this.provider.embedBatch(toEmbed);

    const vectors: Vector[] = candidates.map((c) => c.vector ?? []);
    missingIdx.forEach((idx, k) => {
      vectors[idx] = embedded[k] ?? [];
    });

    const timestamps = candidates.map((c) => c.timestamp ?? 0);
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const tsRange = maxTs - minTs;

    const useChambers = !!(vectorSpace && vectorSpace.isFitted() && chamberBoost > 0);
    let adjacentChambers: Set<number> | null = null;
    if (useChambers) {
      const queryChamber = vectorSpace!.classifyQuery(queryVector);
      adjacentChambers = new Set(vectorSpace!.getAdjacentChambers(queryChamber));
      adjacentChambers.add(queryChamber);
    }

    return candidates.map((item, i) => {
      const vector = vectors[i];
      const tokens = item.tokens ?? estimateTokens(item.text);
      const relevance = vector.length > 0 ? clamp(cosineSimilarity(queryVector, vector), 0, 1) : 0;

      let recency = 0;
      if (recencyBoost > 0 && tsRange > 0) {
        recency = ((item.timestamp ?? minTs) - minTs) / tsRange;
      }

      let chamber = 0;
      if (useChambers && vector.length > 0) {
        const itemChamber = vectorSpace!.classify(vector);
        if (adjacentChambers!.has(itemChamber)) chamber = 1;
      }

      const base = relevance + recencyBoost * recency + chamberBoost * chamber;
      return { item, vector, tokens, relevance, recency, chamber, graph: 0, base };
    });
  }

  private runMmr(
    scored: ScoredCandidate[],
    mmrLambda: number,
    tokenBudget: number,
    maxPerCommunity: number
  ): { selected: ScoredCandidate[]; scores: Record<string, ItemScore>; chamberBoosted: number } {
    const scores: Record<string, ItemScore> = {};
    for (const c of scored) {
      scores[c.item.id] = {
        id: c.item.id,
        relevance: c.relevance,
        recency: c.recency,
        chamber: c.chamber,
        graph: c.graph,
        combined: c.base,
        selected: false,
      };
    }

    const remaining = new Set(scored.map((_, i) => i));
    const selected: ScoredCandidate[] = [];
    const communityCounts = new Map<string, number>();
    let usedTokens = 0;
    let chamberBoosted = 0;

    while (remaining.size > 0) {
      let bestIdx = -1;
      let bestScore = -Infinity;

      for (const idx of remaining) {
        const cand = scored[idx];
        let maxSim = 0;
        for (const sel of selected) {
          if (cand.vector.length === 0 || sel.vector.length === 0) continue;
          const sim = cosineSimilarity(cand.vector, sel.vector);
          if (sim > maxSim) maxSim = sim;
        }
        const mmr = mmrLambda * cand.base - (1 - mmrLambda) * maxSim;
        if (mmr > bestScore) {
          bestScore = mmr;
          bestIdx = idx;
        }
      }

      if (bestIdx === -1) break;
      const chosen = scored[bestIdx];
      remaining.delete(bestIdx);

      const community = String(chosen.item.metadata?.community ?? '');
      if (maxPerCommunity > 0 && community) {
        const count = communityCounts.get(community) ?? 0;
        if (count >= maxPerCommunity) {
          scores[chosen.item.id].combined = bestScore;
          continue;
        }
      }

      if (usedTokens + chosen.tokens > tokenBudget && selected.length > 0) {
        scores[chosen.item.id].combined = bestScore;
        continue;
      }

      selected.push(chosen);
      usedTokens += chosen.tokens;
      scores[chosen.item.id].combined = bestScore;
      scores[chosen.item.id].selected = true;
      if (chosen.chamber > 0) chamberBoosted++;
      if (community) communityCounts.set(community, (communityCounts.get(community) ?? 0) + 1);
    }

    return { selected, scores, chamberBoosted };
  }
}

function applyGraphBoost(
  scored: ScoredCandidate[],
  candidates: ContextItem[],
  opts: { graphBoost: number; graphSeedK: number; hubBoost: number }
): number {
  if (opts.graphBoost <= 0 && opts.hubBoost <= 0) return 0;

  const idToIdx = new Map(candidates.map((c, i) => [c.id, i]));
  const maxDeg = Math.max(1, ...candidates.map((c) => Number(c.metadata?.degree ?? 0)));
  let boosted = 0;

  for (const s of scored) {
    const deg = Number(s.item.metadata?.degree ?? 0);
    if (deg > 0 && opts.hubBoost > 0) {
      const hub = opts.hubBoost * (deg / maxDeg);
      s.base += hub;
    }
  }

  if (opts.graphBoost > 0) {
    const seeds = [...scored].sort((a, b) => b.relevance - a.relevance).slice(0, opts.graphSeedK);
    for (const seed of seeds) {
      const edges = seed.item.metadata?.edges as string[] | undefined;
      if (!edges) continue;
      for (const eid of edges) {
        const idx = idToIdx.get(eid);
        if (idx === undefined) continue;
        if (scored[idx].graph === 0) boosted++;
        scored[idx].graph += opts.graphBoost;
        scored[idx].base += opts.graphBoost;
      }
    }
  }

  return boosted;
}

function applySpecBoost(scored: ScoredCandidate[], options: SelectionOptions): number {
  const specPaths = options.specPaths;
  if (!specPaths || specPaths.length === 0) return 0;

  const boost = options.specBoost ?? DEFAULT_SPEC_BOOST;
  if (boost <= 0) return 0;

  let boosted = 0;
  for (const s of scored) {
    const p = itemPath(s.item);
    if (!p) continue;
    if (pathMentionedInSpec(p, specPaths)) {
      s.base += boost;
      boosted++;
    }
  }
  return boosted;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function computeBaselineTokens(
  scored: ScoredCandidate[],
  baseline: 'all' | 'window',
  windowSize: number
): number {
  if (baseline === 'window') {
    const sorted = [...scored].sort(
      (a, b) => (b.item.timestamp ?? 0) - (a.item.timestamp ?? 0)
    );
    return sorted.slice(0, windowSize).reduce((s, c) => s + c.tokens, 0);
  }
  return scored.reduce((s, c) => s + c.tokens, 0);
}

function buildReasoning(p: {
  candidates: number;
  selected: number;
  tokenBudget: number;
  tokensOut: number;
  percentSaved: number;
  chamberBoosted: number;
  graphBoosted: number;
  mmrLambda: number;
  annPrefilteredFrom?: number;
  pathFiltered?: number;
  specBoosted?: number;
}): string {
  const parts = [
    `Selected ${p.selected}/${p.candidates} items (${p.tokensOut} tokens, budget ${p.tokenBudget}).`,
    `Saved ~${p.percentSaved.toFixed(1)}% vs baseline.`,
    `MMR lambda ${p.mmrLambda.toFixed(2)}.`,
  ];
  if (p.pathFiltered !== undefined && p.pathFiltered > 0) {
    parts.push(`Path filter removed ${p.pathFiltered} candidate(s).`);
  }
  if (p.specBoosted !== undefined && p.specBoosted > 0) {
    parts.push(`${p.specBoosted} spec-anchor boosted.`);
  }
  if (p.annPrefilteredFrom !== undefined) {
    parts.push(`ANN prefiltered from ${p.annPrefilteredFrom}.`);
  }
  if (p.chamberBoosted > 0) parts.push(`${p.chamberBoosted} chamber-boosted.`);
  if (p.graphBoosted > 0) parts.push(`${p.graphBoosted} graph-neighbor boosted.`);
  return parts.join(' ');
}

function emptyResult(reason = 'No candidates provided.'): SelectionResult {
  return {
    selected: [],
    scores: {},
    tokensIn: 0,
    tokensOut: 0,
    tokensSaved: 0,
    percentSaved: 0,
    reasoning: reason,
    breakdown: { candidates: 0, selected: 0, droppedByBudget: 0, chamberBoosted: 0, graphBoosted: 0 },
    droppedIds: [],
  };
}
