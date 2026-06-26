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

const DEFAULT_MMR_LAMBDA = 0.7;
const DEFAULT_CHAMBER_BOOST = 0.15;
const DEFAULT_WINDOW_SIZE = 20;

/** A candidate enriched with the data the selector needs. */
interface ScoredCandidate {
  item: ContextItem;
  vector: Vector;
  tokens: number;
  relevance: number;
  recency: number;
  chamber: number;
  /** relevance + boosts, before MMR redundancy penalty. */
  base: number;
}

/**
 * ContextSelector ranks candidate context against a query and returns the minimal
 * relevant slice that fits a token budget.
 *
 * Ranking is query-aware (cosine similarity is the primary signal) and uses Maximal
 * Marginal Relevance (MMR) so near-duplicate items don't all get selected. Chamber and
 * recency are optional additive boosts. It works from the very first item — chambers
 * are only used when a fitted vector space is supplied.
 */
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

    if (candidates.length === 0) {
      return emptyResult();
    }

    const queryVector = await this.provider.embed(query);
    const scored = await this.scoreCandidates(
      candidates,
      queryVector,
      recencyBoost,
      chamberBoost,
      vectorSpace ?? null
    );

    const { selected, scores, chamberBoosted } = this.runMmr(scored, queryVector, mmrLambda, options.tokenBudget);

    const tokensOut = selected.reduce((s, c) => s + c.tokens, 0);
    const tokensIn = computeBaselineTokens(scored, baseline, windowSize);
    const tokensSaved = Math.max(0, tokensIn - tokensOut);
    const percentSaved = tokensIn > 0 ? (tokensSaved / tokensIn) * 100 : 0;
    const droppedByBudget = scored.length - selected.length;

    return {
      selected: selected.map(c => c.item),
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
        mmrLambda,
      }),
      breakdown: {
        candidates: scored.length,
        selected: selected.length,
        droppedByBudget,
        chamberBoosted,
      },
    };
  }

  private async scoreCandidates(
    candidates: ContextItem[],
    queryVector: Vector,
    recencyBoost: number,
    chamberBoost: number,
    vectorSpace: StructuredVectorSpace | null
  ): Promise<ScoredCandidate[]> {
    // Embed any candidates missing a vector, in one batch.
    const missingIdx: number[] = [];
    const toEmbed: string[] = [];
    candidates.forEach((item, i) => {
      if (!item.vector || item.vector.length === 0) {
        missingIdx.push(i);
        toEmbed.push(item.text);
      }
    });
    let embedded: Vector[] = [];
    if (toEmbed.length > 0) {
      embedded = await this.provider.embedBatch(toEmbed);
    }
    const vectors: Vector[] = candidates.map(c => c.vector ?? []);
    missingIdx.forEach((idx, k) => {
      vectors[idx] = embedded[k] ?? [];
    });

    // Recency normalization across the candidate pool.
    const timestamps = candidates.map(c => c.timestamp ?? 0);
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const tsRange = maxTs - minTs;

    // Chamber context for the query (only when fitted).
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
      return { item, vector, tokens, relevance, recency, chamber, base };
    });
  }

  private runMmr(
    scored: ScoredCandidate[],
    queryVector: Vector,
    mmrLambda: number,
    tokenBudget: number
  ): { selected: ScoredCandidate[]; scores: Record<string, ItemScore>; chamberBoosted: number } {
    const scores: Record<string, ItemScore> = {};
    for (const c of scored) {
      scores[c.item.id] = {
        id: c.item.id,
        relevance: c.relevance,
        recency: c.recency,
        chamber: c.chamber,
        combined: c.base,
        selected: false,
      };
    }

    const remaining = new Set(scored.map((_, i) => i));
    const selected: ScoredCandidate[] = [];
    let usedTokens = 0;
    let chamberBoosted = 0;

    while (remaining.size > 0) {
      let bestIdx = -1;
      let bestScore = -Infinity;

      for (const idx of remaining) {
        const cand = scored[idx];
        // Redundancy: max similarity to anything already selected.
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

      // Budget check: stop once adding would exceed the budget. Always allow at least
      // one item so an oversized single item is still returned (truncation is caller's job).
      if (usedTokens + chosen.tokens > tokenBudget && selected.length > 0) {
        // Skip this item but keep trying smaller ones still in remaining.
        scores[chosen.item.id].combined = bestScore;
        continue;
      }

      selected.push(chosen);
      usedTokens += chosen.tokens;
      scores[chosen.item.id].combined = bestScore;
      scores[chosen.item.id].selected = true;
      if (chosen.chamber > 0) chamberBoosted++;
    }

    return { selected, scores, chamberBoosted };
  }
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
    // Most recent windowSize candidates by timestamp.
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
  mmrLambda: number;
}): string {
  const parts = [
    `Selected ${p.selected}/${p.candidates} items (${p.tokensOut} tokens, budget ${p.tokenBudget}).`,
    `Saved ~${p.percentSaved.toFixed(1)}% vs baseline.`,
    `MMR lambda ${p.mmrLambda.toFixed(2)} (relevance vs diversity).`,
  ];
  if (p.chamberBoosted > 0) parts.push(`${p.chamberBoosted} items chamber-boosted.`);
  return parts.join(' ');
}

function emptyResult(): SelectionResult {
  return {
    selected: [],
    scores: {},
    tokensIn: 0,
    tokensOut: 0,
    tokensSaved: 0,
    percentSaved: 0,
    reasoning: 'No candidates provided.',
    breakdown: { candidates: 0, selected: 0, droppedByBudget: 0, chamberBoosted: 0 },
  };
}
