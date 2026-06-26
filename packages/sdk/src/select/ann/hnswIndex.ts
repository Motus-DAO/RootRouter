import { Vector } from '../../types';

/** Default store size above which ANN prefilter activates. */
export const DEFAULT_ANN_THRESHOLD = 500;

/** Default number of candidates to retrieve via ANN before full MMR. */
export const DEFAULT_ANN_PREFETCH_K = 200;

interface HnswNode {
  id: string;
  vector: Float32Array;
  /** Layer -> neighbor indices into `nodes`. */
  neighbors: number[][];
}

interface ScoredIdx {
  idx: number;
  sim: number;
}

/**
 * Lightweight pure-JS HNSW index for cosine similarity on L2-normalized vectors.
 * Prefilters large candidate pools before full MMR selection.
 */
export class HnswIndex {
  private nodes: HnswNode[] = [];
  private entryPoint = -1;
  private maxLayer = 0;
  private readonly M: number;
  private readonly efConstruction: number;
  private readonly efSearch: number;
  private readonly ml: number;

  constructor(opts?: { M?: number; efConstruction?: number; efSearch?: number }) {
    this.M = opts?.M ?? 16;
    this.efConstruction = opts?.efConstruction ?? 200;
    this.efSearch = opts?.efSearch ?? 64;
    this.ml = 1 / Math.log(this.M);
  }

  get size(): number {
    return this.nodes.length;
  }

  build(items: { id: string; vector: Vector }[]): void {
    this.nodes = [];
    this.entryPoint = -1;
    this.maxLayer = 0;

    for (const item of items) {
      if (item.vector.length === 0) continue;
      this.insert(item.id, normalize(item.vector));
    }
  }

  search(query: Vector, k: number): string[] {
    if (this.nodes.length === 0 || query.length === 0) return [];
    const q = normalize(query);
    const ef = Math.max(k, this.efSearch);

    let ep = this.entryPoint;
    if (ep < 0) return [];

    for (let lc = this.maxLayer; lc > 0; lc--) {
      const nearest = this.searchLayer(q, ep, 1, lc);
      if (nearest.length > 0) ep = nearest[0].idx;
    }

    const candidates = this.searchLayer(q, ep, ef, 0);
    candidates.sort((a, b) => b.sim - a.sim);
    return candidates.slice(0, k).map((c) => this.nodes[c.idx].id);
  }

  private insert(id: string, vector: Float32Array): void {
    const idx = this.nodes.length;
    const layer = randomLayer(this.ml);
    const node: HnswNode = { id, vector, neighbors: [] };
    for (let l = 0; l <= layer; l++) node.neighbors[l] = [];
    this.nodes.push(node);

    if (this.entryPoint < 0) {
      this.entryPoint = idx;
      this.maxLayer = layer;
      return;
    }

    let ep = this.entryPoint;
    for (let lc = this.maxLayer; lc > layer; lc--) {
      const nearest = this.searchLayer(vector, ep, 1, lc);
      if (nearest.length > 0) ep = nearest[0].idx;
    }

    for (let lc = Math.min(layer, this.maxLayer); lc >= 0; lc--) {
      const nearest = this.searchLayer(vector, ep, this.efConstruction, lc);
      const selected = selectNeighbors(this.nodes, vector, nearest, this.M);
      node.neighbors[lc] = selected.map((s) => s.idx);
      for (const s of selected) {
        const nb = this.nodes[s.idx];
        if (!nb.neighbors[lc]) nb.neighbors[lc] = [];
        nb.neighbors[lc].push(idx);
        if (nb.neighbors[lc].length > this.M) {
          const scored = nb.neighbors[lc].map((i) => ({
            idx: i,
            sim: dot(nb.vector, this.nodes[i].vector),
          }));
          nb.neighbors[lc] = selectNeighbors(this.nodes, nb.vector, scored, this.M).map((x) => x.idx);
        }
      }
      ep = selected.length > 0 ? selected[0].idx : ep;
    }

    if (layer > this.maxLayer) {
      this.maxLayer = layer;
      this.entryPoint = idx;
    }
  }

  private searchLayer(
    query: Float32Array,
    entryIdx: number,
    ef: number,
    layer: number
  ): ScoredIdx[] {
    const visited = new Set<number>([entryIdx]);
    const candidates: ScoredIdx[] = [];
    const results: ScoredIdx[] = [];

    const entrySim = dot(query, this.nodes[entryIdx].vector);
    candidates.push({ idx: entryIdx, sim: entrySim });
    results.push({ idx: entryIdx, sim: entrySim });

    while (candidates.length > 0) {
      candidates.sort((a, b) => b.sim - a.sim);
      const current = candidates.pop()!;
      const worst = results.reduce((m, r) => (r.sim < m.sim ? r : m), results[0]);
      if (current.sim < worst.sim && results.length >= ef) break;

      const neighbors = this.nodes[current.idx].neighbors[layer] ?? [];
      for (const ni of neighbors) {
        if (visited.has(ni)) continue;
        visited.add(ni);
        const sim = dot(query, this.nodes[ni].vector);
        if (sim > worst.sim || results.length < ef) {
          candidates.push({ idx: ni, sim });
          results.push({ idx: ni, sim });
          if (results.length > ef) {
            results.sort((a, b) => b.sim - a.sim);
            results.pop();
          }
        }
      }
    }

    return results;
  }
}

/** Prefilter candidates with HNSW when the pool exceeds the threshold. */
export function annPrefilterCandidates(
  query: Vector,
  candidates: { id: string; vector: Vector }[],
  threshold: number,
  prefetchK: number
): Set<string> | null {
  if (candidates.length <= threshold) return null;

  const withVectors = candidates.filter((c) => c.vector.length > 0);
  if (withVectors.length <= threshold) return null;

  const index = new HnswIndex();
  index.build(withVectors);
  const k = Math.min(prefetchK, withVectors.length);
  const ids = index.search(query, k);
  return new Set(ids);
}

function normalize(v: Vector): Float32Array {
  let sum = 0;
  for (const x of v) sum += x * x;
  const inv = sum > 0 ? 1 / Math.sqrt(sum) : 0;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] * inv;
  return out;
}

function dot(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < len; i++) s += a[i] * b[i];
  return s;
}

function randomLayer(ml: number): number {
  let lc = 0;
  while (Math.random() < ml && lc < 16) lc++;
  return lc;
}

function selectNeighbors(
  nodes: HnswNode[],
  query: Float32Array,
  candidates: ScoredIdx[],
  M: number
): ScoredIdx[] {
  candidates.sort((a, b) => b.sim - a.sim);
  const selected: ScoredIdx[] = [];
  for (const c of candidates) {
    if (selected.length >= M) break;
    let tooClose = false;
    for (const s of selected) {
      const sim = dot(nodes[c.idx].vector, nodes[s.idx].vector);
      if (sim > 0.95) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) selected.push(c);
  }
  return selected;
}
