/**
 * Math module tests for RootRouter.
 * Run with: tsx test/math.test.ts
 */

import {
  vectorAdd, vectorSubtract, vectorScale,
  dot, norm, normalize, cosineSimilarity,
  project, reflect, signPattern, vectorMean,
  covarianceMatrix, estimateTokens,
} from '../src/math/vectors';
import { computePCA } from '../src/math/pca';
import { kmeans } from '../src/math/kmeans';
import { TfIdfVectorizer } from '../src/embeddings/tfidf';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name}`);
  }
}

function assertClose(a: number, b: number, name: string, eps = 1e-6): void {
  assert(Math.abs(a - b) < eps, `${name} (${a} ≈ ${b})`);
}

function assertVecClose(a: number[], b: number[], name: string, eps = 1e-6): void {
  assert(
    a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < eps),
    `${name}`
  );
}

// ═══════════════════════════════════════
console.log('\n=== Vector Operations ===');
// ═══════════════════════════════════════

assert(
  JSON.stringify(vectorAdd([1, 2, 3], [4, 5, 6])) === JSON.stringify([5, 7, 9]),
  'vectorAdd'
);

assert(
  JSON.stringify(vectorSubtract([4, 5, 6], [1, 2, 3])) === JSON.stringify([3, 3, 3]),
  'vectorSubtract'
);

assert(
  JSON.stringify(vectorScale([1, 2, 3], 2)) === JSON.stringify([2, 4, 6]),
  'vectorScale'
);

assertClose(dot([1, 2, 3], [4, 5, 6]), 32, 'dot product');

assertClose(norm([3, 4]), 5, 'norm [3,4]');
assertClose(norm([0, 0, 0]), 0, 'norm zero vector');

const unit = normalize([3, 4]);
assertClose(norm(unit), 1, 'normalize produces unit vector');
assertClose(unit[0], 0.6, 'normalize x');
assertClose(unit[1], 0.8, 'normalize y');

// Cosine similarity
assertClose(cosineSimilarity([1, 0], [1, 0]), 1, 'cosine same direction');
assertClose(cosineSimilarity([1, 0], [-1, 0]), -1, 'cosine opposite');
assertClose(cosineSimilarity([1, 0], [0, 1]), 0, 'cosine orthogonal');

// Zero vector cosine
assertClose(cosineSimilarity([0, 0], [1, 1]), 0, 'cosine with zero vector');

// Projection
const proj = project([3, 4], [1, 0]);
assertVecClose(proj, [3, 0], 'project onto x-axis');

const proj2 = project([1, 1], [1, 1]);
assertVecClose(proj2, [1, 1], 'project onto self direction');

// Reflection
// Reflect [1, 1] through hyperplane perpendicular to [1, 0] → [-1, 1]
const ref = reflect([1, 1], [1, 0]);
assertVecClose(ref, [-1, 1], 'reflect through x hyperplane');

// Reflect [1, 0] through hyperplane perpendicular to [0, 1] → [1, 0] (no change)
const ref2 = reflect([1, 0], [0, 1]);
assertVecClose(ref2, [1, 0], 'reflect vector parallel to hyperplane');

// Reflect [0, 1] through hyperplane perpendicular to [0, 1] → [0, -1]
const ref3 = reflect([0, 1], [0, 1]);
assertVecClose(ref3, [0, -1], 'reflect vector perpendicular to hyperplane');

// Sign pattern
const sp = signPattern([1, -2, 3], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
assert(JSON.stringify(sp) === JSON.stringify([1, -1, 1]), 'signPattern');

// Mean
assertVecClose(vectorMean([[1, 2], [3, 4]]), [2, 3], 'vectorMean');

// Covariance (simple case: perfectly correlated)
const cov = covarianceMatrix([[1, 1], [2, 2], [3, 3]]);
// Mean is [2, 2], centered: [-1,-1], [0,0], [1,1]
// Cov should be [[2/3, 2/3], [2/3, 2/3]]
assertClose(cov[0][0], 2 / 3, 'covariance [0][0]');
assertClose(cov[0][1], 2 / 3, 'covariance [0][1]');
assertClose(cov[1][0], 2 / 3, 'covariance [1][0]');
assertClose(cov[1][1], 2 / 3, 'covariance [1][1]');

// Token estimation
const tokens = estimateTokens('hello world this is a test');
assert(tokens > 0, 'estimateTokens returns positive');
assert(tokens === Math.ceil(6 * 1.3), 'estimateTokens ≈ words * 1.3');

// ═══════════════════════════════════════
console.log('\n=== PCA ===');
// ═══════════════════════════════════════

// Data with clear principal direction along [1, 1] (normalized)
const pcaData = [
  [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
  [1.1, 0.9], [2.1, 1.9], [3.1, 2.9],
];
const pca = computePCA(pcaData, 2);

assert(pca.directions.length >= 1, 'PCA finds at least 1 direction');
assert(pca.varianceExplained > 0.8, 'PCA captures most variance');

// First principal direction should be approximately [1/√2, 1/√2]
const d = pca.directions[0].direction;
const absDot = Math.abs(dot(d, normalize([1, 1])));
assert(absDot > 0.95, 'PCA first direction ≈ [1,1] normalized');

// Higher dimensional test
const pcaData3d: number[][] = [];
for (let i = 0; i < 50; i++) {
  // Strong signal along x-axis, noise on y and z
  pcaData3d.push([i * 2, Math.sin(i) * 0.1, Math.cos(i) * 0.1]);
}
const pca3 = computePCA(pcaData3d, 3);
assert(pca3.directions.length >= 1, 'PCA 3D finds directions');
// First direction should be approximately [1, 0, 0]
const d3 = pca3.directions[0].direction;
assert(Math.abs(d3[0]) > 0.9, 'PCA 3D first direction ≈ x-axis');
assert(pca3.directions[0].varianceRatio > 0.9, 'PCA 3D first direction captures >90% variance');

// Edge case: empty input
const pcaEmpty = computePCA([], 3);
assert(pcaEmpty.directions.length === 0, 'PCA on empty input');

// ═══════════════════════════════════════
console.log('\n=== K-Means ===');
// ═══════════════════════════════════════

// Three clearly separable clusters
const cluster1 = [[0, 0], [0.1, 0.1], [-0.1, 0.1], [0.1, -0.1]];
const cluster2 = [[10, 10], [10.1, 10.1], [9.9, 10.1], [10.1, 9.9]];
const cluster3 = [[10, 0], [10.1, 0.1], [9.9, 0.1], [10.1, -0.1]];
const kData = [...cluster1, ...cluster2, ...cluster3];

const kResult = kmeans(kData, 3);
assert(kResult.centroids.length === 3, 'kmeans produces 3 centroids');

// Verify each group of 4 points gets the same assignment
const a1 = kResult.assignments.slice(0, 4);
const a2 = kResult.assignments.slice(4, 8);
const a3 = kResult.assignments.slice(8, 12);

assert(new Set(a1).size === 1, 'cluster 1 all same assignment');
assert(new Set(a2).size === 1, 'cluster 2 all same assignment');
assert(new Set(a3).size === 1, 'cluster 3 all same assignment');

// All three clusters should get different assignments
const clusterIds = new Set([a1[0], a2[0], a3[0]]);
assert(clusterIds.size === 3, 'three distinct cluster assignments');

assert(kResult.iterations > 0, 'kmeans ran at least 1 iteration');

// Edge case: empty
const kEmpty = kmeans([], 3);
assert(kEmpty.centroids.length === 0, 'kmeans on empty input');

// Edge case: k > n
const kSmall = kmeans([[1, 2], [3, 4]], 5);
assert(kSmall.centroids.length === 2, 'kmeans k > n uses n clusters');

// ═══════════════════════════════════════
console.log('\n=== TF-IDF ===');
// ═══════════════════════════════════════

const tfidf = new TfIdfVectorizer(64);
const corpus = [
  'the cat sat on the mat',
  'the dog ran in the park',
  'machine learning is a subset of artificial intelligence',
  'deep learning uses neural networks',
];

const vectors = tfidf.fitTransform(corpus);
assert(vectors.length === 4, 'TF-IDF produces 4 vectors');
assert(vectors[0].length === 64, 'TF-IDF vector dimension = 64');

// Vectors should be L2 normalized
for (let i = 0; i < vectors.length; i++) {
  assertClose(norm(vectors[i]), 1, `TF-IDF vector ${i} is normalized`, 1e-4);
}

// Similar texts should have higher cosine similarity
const simAnimal = cosineSimilarity(vectors[0], vectors[1]);
const simML = cosineSimilarity(vectors[2], vectors[3]);
const simCross = cosineSimilarity(vectors[0], vectors[2]);
assert(simAnimal > simCross, 'animal texts more similar to each other than to ML text');
assert(simML > simCross, 'ML texts more similar to each other than to animal text');

// Transform new text after fitting
const newVec = tfidf.transform('the cat played with the dog');
assert(newVec.length === 64, 'TF-IDF transform on new text');
assert(tfidf.isFitted(), 'TF-IDF reports fitted');
assert(tfidf.vocabularySize() > 0, 'TF-IDF has vocabulary');

// ═══════════════════════════════════════
console.log('\n=== Results ===');
// ═══════════════════════════════════════

console.log(`\nTotal: ${passed + failed} tests, ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
}
