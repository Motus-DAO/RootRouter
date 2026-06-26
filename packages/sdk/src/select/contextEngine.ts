import { RootPair, Vector } from '../types';
import { norm } from '../math/vectors';
import { StructuredVectorSpace } from '../core/vectorSpace';
import {
  ContextItem,
  ContextStore,
  EmbeddingProvider,
  SelectionOptions,
  SelectionResult,
} from './types';
import { ContextSelector } from './selector';
import { TfIdfEmbeddingProvider } from './embedding/tfidfProvider';
import { InMemoryContextStore } from './store/inMemoryStore';

export interface ContextEngineOptions {
  /** Embedding provider. Defaults to zero-dependency TF-IDF. */
  provider?: EmbeddingProvider;
  /** Context store. Defaults to in-memory. */
  store?: ContextStore;
  /**
   * Enable chamber-based boosting in selection. When on, the engine fits a
   * StructuredVectorSpace over the stored item embeddings and boosts items sharing
   * the query's chamber. Default false (pure similarity + MMR, works from item #1).
   */
  useChambers?: boolean;
  /** Minimum stored items before chambers are fit. Default 12. */
  minItemsForChambers?: number;
  /** PCA dimensions for chamber fitting. Default 8. */
  pcaDimensions?: number;
}

/**
 * ContextEngine is the stateful core that external integrations (the MCP server, SDK
 * users) hold. It owns a context store and an embedding provider, and runs selection
 * without ever calling an LLM.
 *
 * Default behavior is provider-agnostic similarity + MMR that works from the first
 * recorded item. Chambers are an optional boost enabled via `useChambers`.
 */
export class ContextEngine {
  private provider: EmbeddingProvider;
  private store: ContextStore;
  private selector: ContextSelector;
  private vectorSpace: StructuredVectorSpace | null;
  private useChambers: boolean;
  private minItemsForChambers: number;
  private chambersDirty: boolean = true;

  private totalTokensSaved: number = 0;
  private totalSelections: number = 0;

  constructor(options: ContextEngineOptions = {}) {
    this.provider = options.provider ?? new TfIdfEmbeddingProvider();
    this.store = options.store ?? new InMemoryContextStore();
    this.selector = new ContextSelector(this.provider);
    this.useChambers = options.useChambers ?? false;
    this.minItemsForChambers = options.minItemsForChambers ?? 12;
    this.vectorSpace = this.useChambers
      ? new StructuredVectorSpace(options.pcaDimensions ?? 8)
      : null;
  }

  /** Record (insert or update) context items. */
  record(items: ContextItem[]): void {
    if (items.length === 0) return;
    this.store.upsert(items);
    this.chambersDirty = true;
  }

  /** Select the minimal relevant slice of stored context for a query. */
  async select(query: string, options: SelectionOptions): Promise<SelectionResult> {
    const candidates = this.store.all(options.agentId);

    // Refit the (TF-IDF) provider over the current corpus so query and candidate
    // vectors live in the same space. Cheap for TF-IDF; no-op for API providers.
    if (this.provider.fit) {
      const corpus = candidates.map(c => c.text);
      corpus.push(query);
      this.provider.fit(corpus);
    }

    if (this.useChambers && this.vectorSpace) {
      await this.ensureChambers(candidates);
    }

    const result = await this.selector.select(query, candidates, options, this.vectorSpace);

    this.totalTokensSaved += result.tokensSaved;
    this.totalSelections += 1;
    return result;
  }

  /** Force a chamber refit on next selection (e.g. after bulk record). */
  invalidateChambers(): void {
    this.chambersDirty = true;
  }

  /** Persist the store if it supports durability. */
  async save(): Promise<void> {
    if (this.store.save) await this.store.save();
  }

  /** Load the store if it supports durability. */
  async load(): Promise<void> {
    if (this.store.load) await this.store.load();
    this.chambersDirty = true;
  }

  /** Engine statistics. */
  stats(): {
    items: number;
    selections: number;
    totalTokensSaved: number;
    chambersEnabled: boolean;
    chambersFitted: boolean;
  } {
    return {
      items: this.store.size,
      selections: this.totalSelections,
      totalTokensSaved: this.totalTokensSaved,
      chambersEnabled: this.useChambers,
      chambersFitted: !!this.vectorSpace?.isFitted(),
    };
  }

  getStore(): ContextStore {
    return this.store;
  }

  private async ensureChambers(candidates: ContextItem[]): Promise<void> {
    if (!this.vectorSpace) return;
    if (!this.chambersDirty) return;
    if (candidates.length < this.minItemsForChambers) return;

    const vectors = await this.provider.embedBatch(candidates.map(c => c.text));
    const pseudoPairs = vectors
      .filter(v => v.length > 0)
      .map(v => ({
        rootVector: v,
        rootNorm: norm(v),
        modelUsed: 'context',
        chamberId: null,
      })) as unknown as RootPair[];

    this.vectorSpace.fit(pseudoPairs);
    this.chambersDirty = false;
  }
}
