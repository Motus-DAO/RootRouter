import { EmbeddingProvider } from '../types';
import { TfIdfEmbeddingProvider } from './tfidfProvider';
import { ApiEmbeddingProvider } from './apiProvider';
import { CachedEmbeddingProvider } from './cachedProvider';
import { LocalOnnxEmbeddingProvider, type LocalEmbeddingModel } from './onnxProvider';

export interface BuildProviderOptions {
  /** When false, skip the content-hash cache wrapper. Default true. */
  useCache?: boolean;
  /** Max embedding cache entries. Default 10_000. */
  cacheMaxEntries?: number;
}

/**
 * Build an embedding provider from environment variables.
 *
 * - `EMBEDDING_PROVIDER`: `tfidf` (default), `api`, or `local`
 * - `EMBEDDING_API_KEY`: when set and provider unset, uses API provider
 * - `EMBEDDING_API_URL`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSION`
 * - `EMBEDDING_LOCAL_MODEL`: `minilm` (default) or `bge-small` for local ONNX
 */
export function buildEmbeddingProviderFromEnv(
  options: BuildProviderOptions = {}
): EmbeddingProvider {
  const useCache = options.useCache !== false;
  const base = buildBaseProviderFromEnv();
  if (!useCache) return base;
  return new CachedEmbeddingProvider(base, { maxEntries: options.cacheMaxEntries });
}

function buildBaseProviderFromEnv(): EmbeddingProvider {
  const explicit = (process.env.EMBEDDING_PROVIDER ?? '').toLowerCase();
  const apiKey = process.env.EMBEDDING_API_KEY;

  if (explicit === 'local') {
    const model = (process.env.EMBEDDING_LOCAL_MODEL ?? 'minilm') as LocalEmbeddingModel;
    return new LocalOnnxEmbeddingProvider(model);
  }

  // An explicit local choice must win over ambient API credentials. This keeps
  // generated MCP configs deterministic and avoids placeholder keys forcing API mode.
  if (explicit === 'tfidf') {
    return new TfIdfEmbeddingProvider();
  }

  if (explicit === 'api' || apiKey) {
    if (!apiKey) {
      throw new Error('EMBEDDING_PROVIDER=api requires EMBEDDING_API_KEY');
    }
    return new ApiEmbeddingProvider({
      embeddingApiKey: apiKey,
      embeddingApiUrl: process.env.EMBEDDING_API_URL ?? 'https://api.openai.com/v1/embeddings',
      embeddingModel: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
      embeddingDimension: Number(process.env.EMBEDDING_DIMENSION ?? 128),
    });
  }

  if (!explicit) {
    return new TfIdfEmbeddingProvider();
  }

  return new TfIdfEmbeddingProvider();
}
