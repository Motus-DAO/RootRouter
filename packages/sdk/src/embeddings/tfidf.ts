import { Vector } from '../types';

/**
 * Local TF-IDF vectorizer that works without any API keys.
 * Converts text into fixed-dimension vectors based on term frequency-inverse document frequency.
 *
 * The vectorizer builds a vocabulary from training texts, then can transform
 * any new text into a vector in that vocabulary space. To keep vectors at a
 * fixed dimension, it uses hashing to map tokens to buckets.
 */
export class TfIdfVectorizer {
  private dimension: number;
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments: number = 0;
  private fitted: boolean = false;

  constructor(dimension: number = 128) {
    this.dimension = dimension;
  }

  /** Tokenize text into lowercase terms */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  /** Simple string hash to bucket index */
  private hash(token: string): number {
    let h = 0;
    for (let i = 0; i < token.length; i++) {
      h = ((h << 5) - h + token.charCodeAt(i)) | 0;
    }
    return ((h % this.dimension) + this.dimension) % this.dimension;
  }

  /**
   * Fit the vectorizer on a corpus of texts.
   * Computes document frequency for IDF calculation.
   */
  fit(texts: string[]): void {
    this.documentFrequency.clear();
    this.totalDocuments = texts.length;

    for (const text of texts) {
      const tokens = this.tokenize(text);
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        this.documentFrequency.set(token, (this.documentFrequency.get(token) ?? 0) + 1);
      }
    }

    this.fitted = true;
  }

  /**
   * Transform a single text into a TF-IDF vector.
   * If not yet fitted, uses TF-only (IDF defaults to 1).
   */
  transform(text: string): Vector {
    const tokens = this.tokenize(text);
    const vec = new Array(this.dimension).fill(0);

    if (tokens.length === 0) return vec;

    // Compute term frequency
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    // Compute TF-IDF for each token and hash into bucket
    for (const [token, count] of tf) {
      const termFreq = count / tokens.length;

      let idf = 1;
      if (this.fitted && this.totalDocuments > 0) {
        const df = this.documentFrequency.get(token) ?? 0;
        idf = Math.log(1 + this.totalDocuments / (1 + df));
      }

      const bucket = this.hash(token);
      vec[bucket] += termFreq * idf;
    }

    // L2 normalize
    let magnitude = 0;
    for (let i = 0; i < this.dimension; i++) magnitude += vec[i] * vec[i];
    magnitude = Math.sqrt(magnitude);

    if (magnitude > 0) {
      for (let i = 0; i < this.dimension; i++) vec[i] /= magnitude;
    }

    return vec;
  }

  /**
   * Fit on texts then transform all of them.
   */
  fitTransform(texts: string[]): Vector[] {
    this.fit(texts);
    return texts.map(t => this.transform(t));
  }

  /** Whether the vectorizer has been fitted */
  isFitted(): boolean {
    return this.fitted;
  }

  /** Number of unique terms seen during fit */
  vocabularySize(): number {
    return this.documentFrequency.size;
  }
}
