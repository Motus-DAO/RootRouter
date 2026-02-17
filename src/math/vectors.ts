import { Vector } from '../types';

/** Element-wise addition */
export function vectorAdd(a: Vector, b: Vector): Vector {
  const len = Math.min(a.length, b.length);
  const result = new Array(len);
  for (let i = 0; i < len; i++) result[i] = a[i] + b[i];
  return result;
}

/** Element-wise subtraction: a - b */
export function vectorSubtract(a: Vector, b: Vector): Vector {
  const len = Math.min(a.length, b.length);
  const result = new Array(len);
  for (let i = 0; i < len; i++) result[i] = a[i] - b[i];
  return result;
}

/** Scalar multiplication */
export function vectorScale(v: Vector, scalar: number): Vector {
  const result = new Array(v.length);
  for (let i = 0; i < v.length; i++) result[i] = v[i] * scalar;
  return result;
}

/** Dot product */
export function dot(a: Vector, b: Vector): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += a[i] * b[i];
  return sum;
}

/** L2 norm (magnitude) */
export function norm(v: Vector): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

/** Normalize to unit vector */
export function normalize(v: Vector): Vector {
  const n = norm(v);
  if (n === 0) return v.map(() => 0);
  return vectorScale(v, 1 / n);
}

/** Cosine similarity (-1 to 1) */
export function cosineSimilarity(a: Vector, b: Vector): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

/** Project vector v onto direction d: (v·d / d·d) * d */
export function project(v: Vector, d: Vector): Vector {
  const dd = dot(d, d);
  if (dd === 0) return d.map(() => 0);
  return vectorScale(d, dot(v, d) / dd);
}

/**
 * Reflect vector v through the hyperplane perpendicular to direction d.
 * reflection(v, d) = v - 2 * project(v, d)
 */
export function reflect(v: Vector, d: Vector): Vector {
  const proj = project(v, d);
  const result = new Array(v.length);
  for (let i = 0; i < v.length; i++) result[i] = v[i] - 2 * proj[i];
  return result;
}

/**
 * Compute sign pattern of vector v relative to directions.
 * For each direction d_i, returns +1 if dot(v, d_i) >= 0, else -1.
 */
export function signPattern(v: Vector, directions: Vector[]): number[] {
  return directions.map(d => (dot(v, d) >= 0 ? 1 : -1));
}

/** Compute the mean of a set of vectors */
export function vectorMean(vectors: Vector[]): Vector {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  const n = vectors.length;
  for (let i = 0; i < dim; i++) sum[i] /= n;
  return sum;
}

/** Compute covariance matrix of a set of vectors (returns d×d matrix) */
export function covarianceMatrix(vectors: Vector[]): number[][] {
  if (vectors.length === 0) return [];
  const mean = vectorMean(vectors);
  const dim = mean.length;
  const n = vectors.length;

  // Center the data
  const centered = vectors.map(v => vectorSubtract(v, mean));

  // Compute covariance: C = (1/n) * X^T * X
  const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
  for (const v of centered) {
    for (let i = 0; i < dim; i++) {
      for (let j = i; j < dim; j++) {
        cov[i][j] += v[i] * v[j];
      }
    }
  }
  // Symmetrize and normalize
  for (let i = 0; i < dim; i++) {
    cov[i][i] /= n;
    for (let j = i + 1; j < dim; j++) {
      cov[i][j] /= n;
      cov[j][i] = cov[i][j];
    }
  }
  return cov;
}

/** Estimate token count from text (rough: words * 1.3) */
export function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.ceil(words * 1.3);
}
