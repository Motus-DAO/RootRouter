import { Vector } from '../../types';
import { EmbeddingProvider } from '../types';
import { contentHash } from './contentHash';

export interface CachedEmbeddingOptions {
  /** Max cached entries; oldest evicted when exceeded. 0 = unbounded. Default 10_000. */
  maxEntries?: number;
}

/**
 * Content-hash keyed embedding cache wrapping any EmbeddingProvider.
 * Avoids re-embedding unchanged text across requests and selection passes.
 */
export class CachedEmbeddingProvider implements EmbeddingProvider {
  private inner: EmbeddingProvider;
  private cache = new Map<string, Vector>();
  private maxEntries: number;

  readonly dimension: number;

  constructor(inner: EmbeddingProvider, options: CachedEmbeddingOptions = {}) {
    this.inner = inner;
    this.dimension = inner.dimension;
    this.maxEntries = options.maxEntries ?? 10_000;
  }

  get innerProvider(): EmbeddingProvider {
    return this.inner;
  }

  cacheSize(): number {
    return this.cache.size;
  }

  async embed(text: string): Promise<Vector> {
    const key = contentHash(text);
    const hit = this.cache.get(key);
    if (hit) return hit;
    const vec = await this.inner.embed(text);
    this.set(key, vec);
    return vec;
  }

  async embedBatch(texts: string[]): Promise<Vector[]> {
    if (texts.length === 0) return [];

    const keys = texts.map(contentHash);
    const results: Vector[] = new Array(texts.length);
    const missIdx: number[] = [];
    const missTexts: string[] = [];

    keys.forEach((key, i) => {
      const hit = this.cache.get(key);
      if (hit) {
        results[i] = hit;
      } else {
        missIdx.push(i);
        missTexts.push(texts[i]);
      }
    });

    if (missTexts.length > 0) {
      const embedded = await this.inner.embedBatch(missTexts);
      missIdx.forEach((origIdx, k) => {
        const vec = embedded[k] ?? [];
        results[origIdx] = vec;
        this.set(keys[origIdx], vec);
      });
    }

    return results;
  }

  fit?(corpus: string[]): void {
    if (this.inner.fit) this.inner.fit(corpus);
  }

  private set(key: string, vec: Vector): void {
    if (this.maxEntries > 0 && this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, vec);
  }
}
