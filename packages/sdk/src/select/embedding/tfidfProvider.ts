import { Vector } from '../../types';
import { TfIdfVectorizer } from '../../embeddings/tfidf';
import { EmbeddingProvider } from '../types';

/**
 * Default zero-dependency embedding provider backed by the local TF-IDF vectorizer.
 *
 * TF-IDF needs a corpus to compute IDF weights. Call `fit(corpus)` (the ContextEngine
 * does this as items are recorded) for better term weighting; before fitting it falls
 * back to TF-only vectors, which still work for similarity ranking from item #1.
 */
export class TfIdfEmbeddingProvider implements EmbeddingProvider {
  private vectorizer: TfIdfVectorizer;
  readonly dimension: number;

  constructor(dimension: number = 128) {
    this.dimension = dimension;
    this.vectorizer = new TfIdfVectorizer(dimension);
  }

  async embed(text: string): Promise<Vector> {
    return this.vectorizer.transform(text);
  }

  async embedBatch(texts: string[]): Promise<Vector[]> {
    return texts.map(t => this.vectorizer.transform(t));
  }

  fit(corpus: string[]): void {
    if (corpus.length === 0) return;
    this.vectorizer.fit(corpus);
  }

  isFitted(): boolean {
    return this.vectorizer.isFitted();
  }
}
