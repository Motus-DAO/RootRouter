import { Vector, RootDirection, Chamber, Reflection, RootPair } from '../types';
import { computePCA, PCAResult } from '../math/pca';
import {
  signPattern as computeSignPattern, reflect as reflectVector,
  dot, norm, vectorMean, cosineSimilarity,
} from '../math/vectors';

/**
 * StructuredVectorSpace manages the algebraic structure of the root vector space.
 *
 * 1. Root Directions via PCA — principal axes of variation ("simple roots")
 * 2. Chambers via sign patterns — regions bounded by root direction hyperplanes ("Weyl chambers")
 * 3. Reflections through hyperplanes — maps to complementary chambers
 */
export class StructuredVectorSpace {
  private rootDirections: RootDirection[] = [];
  private chambers: Map<number, Chamber> = new Map();
  private pcaResult: PCAResult | null = null;
  private _fitted: boolean = false;
  private pcaDimensions: number;

  constructor(pcaDimensions: number = 8) {
    this.pcaDimensions = pcaDimensions;
  }

  fit(rootPairs: RootPair[]): void {
    const rootVectors = rootPairs.map(p => p.rootVector).filter(v => v.length > 0);
    if (rootVectors.length < 3) return;

    this.pcaResult = computePCA(rootVectors, this.pcaDimensions);
    this.rootDirections = this.pcaResult.directions;
    this._fitted = true;

    // Assign chambers to all pairs
    this.chambers.clear();
    const directionVecs = this.rootDirections.map(d => d.direction);

    for (const pair of rootPairs) {
      if (pair.rootVector.length === 0) continue;
      const chamberId = this.classify(pair.rootVector);
      pair.chamberId = chamberId;

      if (!this.chambers.has(chamberId)) {
        const sp = computeSignPattern(pair.rootVector, directionVecs);
        this.chambers.set(chamberId, {
          id: chamberId,
          signPattern: sp,
          centroid: [...pair.rootVector],
          avgRootNorm: pair.rootNorm,
          interactionCount: 0,
          bestModel: pair.modelUsed,
          modelPerformance: {},
          adjacentChamberIds: this.computeAdjacentIds(chamberId),
        });
      }

      const chamber = this.chambers.get(chamberId)!;
      chamber.interactionCount++;

      // Update centroid as running mean
      const n = chamber.interactionCount;
      const dim = pair.rootVector.length;
      for (let i = 0; i < dim; i++) {
        chamber.centroid[i] = chamber.centroid[i] * ((n - 1) / n) + pair.rootVector[i] / n;
      }

      // Update avg root norm
      chamber.avgRootNorm = chamber.avgRootNorm * ((n - 1) / n) + pair.rootNorm / n;

      // Track model performance
      const model = pair.modelUsed;
      if (!chamber.modelPerformance[model]) {
        chamber.modelPerformance[model] = { avgNorm: 0, count: 0 };
      }
      const mp = chamber.modelPerformance[model];
      mp.count++;
      mp.avgNorm = mp.avgNorm * ((mp.count - 1) / mp.count) + pair.rootNorm / mp.count;

      // Update best model
      let bestNorm = Infinity;
      for (const [m, perf] of Object.entries(chamber.modelPerformance)) {
        if (perf.avgNorm < bestNorm) {
          bestNorm = perf.avgNorm;
          chamber.bestModel = m;
        }
      }
    }
  }

  isFitted(): boolean {
    return this._fitted;
  }

  getRootDirections(): RootDirection[] {
    return this.rootDirections;
  }

  classify(rootVector: Vector): number {
    if (!this._fitted || this.rootDirections.length === 0) return 0;
    const dirVecs = this.rootDirections.map(d => d.direction);
    const sp = computeSignPattern(rootVector, dirVecs);
    return this.signPatternToId(sp);
  }

  classifyQuery(queryVector: Vector): number {
    return this.classify(queryVector);
  }

  getChamber(id: number): Chamber | undefined {
    return this.chambers.get(id);
  }

  getAllChambers(): Chamber[] {
    return Array.from(this.chambers.values());
  }

  getAdjacentChambers(chamberId: number): number[] {
    return this.computeAdjacentIds(chamberId);
  }

  reflect(vector: Vector, rootDirectionIndex: number): Reflection {
    if (rootDirectionIndex >= this.rootDirections.length) {
      return { original: vector, reflected: vector, rootDirectionIndex, projectionMagnitude: 0 };
    }
    const d = this.rootDirections[rootDirectionIndex].direction;
    const reflected = reflectVector(vector, d);
    const dd = dot(d, d);
    const projMag = dd > 0 ? Math.abs(dot(vector, d) / Math.sqrt(dd)) : 0;
    return { original: vector, reflected, rootDirectionIndex, projectionMagnitude: projMag };
  }

  reflectAll(vector: Vector): { reflections: Reflection[]; chamberIds: number[] } {
    const reflections: Reflection[] = [];
    const chamberIds = new Set<number>();
    for (let i = 0; i < this.rootDirections.length; i++) {
      const ref = this.reflect(vector, i);
      reflections.push(ref);
      chamberIds.add(this.classify(ref.reflected));
    }
    return { reflections, chamberIds: Array.from(chamberIds) };
  }

  getInteractionMatrix(): number[][] {
    const k = this.rootDirections.length;
    const matrix: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < k; i++) {
      const di = this.rootDirections[i].direction;
      const didi = dot(di, di);
      for (let j = 0; j < k; j++) {
        const dj = this.rootDirections[j].direction;
        matrix[i][j] = didi > 0 ? (2 * dot(di, dj)) / didi : 0;
      }
    }
    return matrix;
  }

  getSummary(): {
    directionsFound: number;
    varianceExplained: number;
    activeChambers: number;
    totalChambers: number;
    avgNormByChamber: Record<number, number>;
  } {
    const avgNormByChamber: Record<number, number> = {};
    for (const [id, ch] of this.chambers) {
      avgNormByChamber[id] = ch.avgRootNorm;
    }
    return {
      directionsFound: this.rootDirections.length,
      varianceExplained: this.pcaResult?.varianceExplained ?? 0,
      activeChambers: this.chambers.size,
      totalChambers: 1 << this.rootDirections.length,
      avgNormByChamber,
    };
  }

  /** Convert sign pattern to chamber ID via binary encoding: +1→1, -1→0 */
  private signPatternToId(sp: number[]): number {
    let id = 0;
    for (let i = 0; i < sp.length; i++) {
      if (sp[i] > 0) id |= (1 << i);
    }
    return id;
  }

  /** Chambers adjacent by Hamming distance 1 (one bit flip) */
  private computeAdjacentIds(chamberId: number): number[] {
    const adj: number[] = [];
    for (let i = 0; i < this.rootDirections.length; i++) {
      adj.push(chamberId ^ (1 << i));
    }
    return adj;
  }
}
