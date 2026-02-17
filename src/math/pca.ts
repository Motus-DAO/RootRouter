import { Vector, RootDirection } from '../types';
import { vectorMean, vectorSubtract, covarianceMatrix, norm, vectorScale, dot } from './vectors';

export interface PCAResult {
  directions: RootDirection[];
  mean: Vector;
  totalVariance: number;
  varianceExplained: number;
}

/**
 * Multiply a symmetric matrix M by vector v: result = M * v
 */
function matVecMul(M: number[][], v: Vector): Vector {
  const d = v.length;
  const result = new Array(d).fill(0);
  for (let i = 0; i < d; i++) {
    let sum = 0;
    for (let j = 0; j < d; j++) {
      sum += M[i][j] * v[j];
    }
    result[i] = sum;
  }
  return result;
}

/**
 * Deflate matrix: M = M - eigenvalue * v * v^T
 */
function deflate(M: number[][], eigenvalue: number, v: Vector): void {
  const d = v.length;
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      M[i][j] -= eigenvalue * v[i] * v[j];
    }
  }
}

/**
 * Compute PCA on a set of vectors using power iteration with deflation.
 *
 * @param vectors - The data points (root vectors from interactions)
 * @param k - Number of principal components to extract (default: 8)
 * @returns PCAResult with root directions
 */
export function computePCA(vectors: Vector[], k: number = 8): PCAResult {
  if (vectors.length === 0) {
    return { directions: [], mean: [], totalVariance: 0, varianceExplained: 0 };
  }

  const dim = vectors[0].length;
  k = Math.min(k, dim, vectors.length);

  const mean = vectorMean(vectors);
  const cov = covarianceMatrix(vectors);

  // Total variance = trace of covariance matrix
  let totalVariance = 0;
  for (let i = 0; i < dim; i++) totalVariance += cov[i][i];

  // Deep copy cov for deflation
  const C = cov.map(row => [...row]);

  const directions: RootDirection[] = [];
  let explainedSum = 0;

  for (let comp = 0; comp < k; comp++) {
    // Initialize with a seeded pseudo-random unit vector
    let v = new Array(dim);
    for (let i = 0; i < dim; i++) {
      // Simple deterministic seed based on component index
      v[i] = Math.sin((comp + 1) * (i + 1) * 1.23456);
    }
    const n = norm(v);
    if (n > 0) v = vectorScale(v, 1 / n);

    // Power iteration
    for (let iter = 0; iter < 200; iter++) {
      const Cv = matVecMul(C, v);
      const nCv = norm(Cv);
      if (nCv < 1e-10) break;
      const vNew = vectorScale(Cv, 1 / nCv);

      // Check convergence
      let diff = 0;
      for (let i = 0; i < dim; i++) diff += (vNew[i] - v[i]) ** 2;
      v = vNew;
      if (diff < 1e-12) break;
    }

    // Eigenvalue = v^T * C * v
    const Cv = matVecMul(C, v);
    const eigenvalue = Math.max(0, dot(v, Cv));

    if (eigenvalue < 1e-10) break;

    directions.push({
      index: comp,
      direction: v,
      eigenvalue,
      varianceRatio: totalVariance > 0 ? eigenvalue / totalVariance : 0,
    });

    explainedSum += eigenvalue;

    // Deflate
    deflate(C, eigenvalue, v);
  }

  return {
    directions,
    mean,
    totalVariance,
    varianceExplained: totalVariance > 0 ? explainedSum / totalVariance : 0,
  };
}
