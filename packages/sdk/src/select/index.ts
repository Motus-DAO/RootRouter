import { ContextItem, EmbeddingProvider, SelectionOptions, SelectionResult } from './types';
import { ContextSelector } from './selector';
import { TfIdfEmbeddingProvider } from './embedding/tfidfProvider';

export type {
  ContextItem,
  ContextItemKind,
  ContextStore,
  EmbeddingProvider,
  ItemScore,
  SelectionBaseline,
  SelectionOptions,
  SelectionResult,
} from './types';

export { ContextSelector } from './selector';
export { ContextEngine } from './contextEngine';
export type { ContextEngineOptions } from './contextEngine';

export { TfIdfEmbeddingProvider } from './embedding/tfidfProvider';
export { ApiEmbeddingProvider } from './embedding/apiProvider';
export type { ApiEmbeddingConfig } from './embedding/apiProvider';
export { CachedEmbeddingProvider } from './embedding/cachedProvider';
export type { CachedEmbeddingOptions } from './embedding/cachedProvider';
export { LocalOnnxEmbeddingProvider } from './embedding/onnxProvider';
export type { LocalEmbeddingModel } from './embedding/onnxProvider';
export { buildEmbeddingProviderFromEnv } from './embedding/buildProvider';
export type { BuildProviderOptions } from './embedding/buildProvider';
export { contentHash } from './embedding/contentHash';
export { HnswIndex, annPrefilterCandidates, DEFAULT_ANN_THRESHOLD, DEFAULT_ANN_PREFETCH_K } from './ann/hnswIndex';

export { InMemoryContextStore } from './store/inMemoryStore';
export type { InMemoryStoreOptions } from './store/inMemoryStore';
export { FileContextStore } from './store/fileStore';
export type { FileStoreOptions } from './store/fileStore';

/**
 * Stateless one-shot context selection. Convenience wrapper for callers that already
 * hold their candidate items in memory and just want the minimal relevant slice.
 *
 * Builds a transient TF-IDF provider (fit on the provided items) unless one is given.
 */
export async function selectContext(params: {
  query: string;
  items: ContextItem[];
  tokenBudget: number;
  provider?: EmbeddingProvider;
  options?: Partial<Omit<SelectionOptions, 'tokenBudget'>>;
}): Promise<SelectionResult> {
  const provider = params.provider ?? new TfIdfEmbeddingProvider();
  if (provider.fit) {
    const corpus = params.items.map(i => i.text);
    corpus.push(params.query);
    provider.fit(corpus);
  }
  const selector = new ContextSelector(provider);
  return selector.select(
    params.query,
    params.items,
    { tokenBudget: params.tokenBudget, ...params.options },
    null
  );
}
