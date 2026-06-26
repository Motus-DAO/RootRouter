import { Vector } from '../types';
import { vectorMean, vectorSubtract, norm } from './vectors';

export interface KMeansResult {
  centroids: Vector[];
  assignments: number[];
  iterations: number;
}

/**
 * K-means clustering from scratch.
 * @param vectors - Data points
 * @param k - Number of clusters
 * @param maxIterations - Max iterations (default 50)
 */
export function kmeans(vectors: Vector[], k: number, maxIterations: number = 50): KMeansResult {
  const n = vectors.length;
  if (n === 0 || k <= 0) {
    return { centroids: [], assignments: [], iterations: 0 };
  }
  k = Math.min(k, n);
  const dim = vectors[0].length;

  // Initialize centroids using k-means++ style: pick spread-out initial points
  const centroids: Vector[] = [];
  const usedIndices = new Set<number>();

  // First centroid: pick index 0
  centroids.push([...vectors[0]]);
  usedIndices.add(0);

  for (let c = 1; c < k; c++) {
    // For each point, compute min distance to existing centroids
    let maxDist = -1;
    let bestIdx = 0;
    for (let i = 0; i < n; i++) {
      if (usedIndices.has(i)) continue;
      let minDist = Infinity;
      for (const centroid of centroids) {
        const d = norm(vectorSubtract(vectors[i], centroid));
        if (d < minDist) minDist = d;
      }
      if (minDist > maxDist) {
        maxDist = minDist;
        bestIdx = i;
      }
    }
    centroids.push([...vectors[bestIdx]]);
    usedIndices.add(bestIdx);
  }

  let assignments = new Array(n).fill(0);
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;

    // Assign each point to nearest centroid
    const newAssignments = new Array(n);
    for (let i = 0; i < n; i++) {
      let bestCluster = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const d = norm(vectorSubtract(vectors[i], centroids[c]));
        if (d < bestDist) {
          bestDist = d;
          bestCluster = c;
        }
      }
      newAssignments[i] = bestCluster;
    }

    // Check convergence
    let changed = false;
    for (let i = 0; i < n; i++) {
      if (newAssignments[i] !== assignments[i]) {
        changed = true;
        break;
      }
    }
    assignments = newAssignments;

    if (!changed) break;

    // Recompute centroids
    for (let c = 0; c < k; c++) {
      const members = vectors.filter((_, i) => assignments[i] === c);
      if (members.length > 0) {
        centroids[c] = vectorMean(members);
      }
    }
  }

  return { centroids, assignments, iterations };
}
