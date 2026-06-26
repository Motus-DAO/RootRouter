import { Vector, RouterConfig } from '../../types';
import { embed as apiEmbed, embedBatch as apiEmbedBatch } from '../../embeddings/api';
import { EmbeddingProvider } from '../types';

/** Subset of config needed to call an OpenAI-compatible embedding endpoint. */
export type ApiEmbeddingConfig = Pick<
  RouterConfig,
  'embeddingModel' | 'embeddingApiUrl' | 'embeddingApiKey' | 'embeddingDimension'
>;

/**
 * Opt-in embedding provider backed by an OpenAI-compatible embeddings API.
 *
 * Wraps the existing `embed`/`embedBatch` helpers. Use this when you want real
 * semantic embeddings instead of the local TF-IDF default. Requires an API key.
 */
export class ApiEmbeddingProvider implements EmbeddingProvider {
  private config: ApiEmbeddingConfig;
  readonly dimension: number;

  constructor(config: ApiEmbeddingConfig) {
    this.config = config;
    this.dimension = config.embeddingDimension;
  }

  async embed(text: string): Promise<Vector> {
    return apiEmbed(text, this.config as RouterConfig);
  }

  async embedBatch(texts: string[]): Promise<Vector[]> {
    if (texts.length === 0) return [];
    return apiEmbedBatch(texts, this.config as RouterConfig);
  }
}
