import { ContextItem, ContextStore } from '../types';

/** Options for the in-memory store. */
export interface InMemoryStoreOptions {
  /**
   * Maximum number of items to retain. When exceeded, the oldest items (by insertion
   * order, refreshed on upsert) are evicted. 0 or undefined means unbounded.
   */
  maxItems?: number;
}

/**
 * Simple in-memory context store backed by a Map (preserves insertion order).
 * Suitable for single-process usage and as the base for the file-backed store.
 */
export class InMemoryContextStore implements ContextStore {
  protected items: Map<string, ContextItem> = new Map();
  protected maxItems: number;

  constructor(options: InMemoryStoreOptions = {}) {
    this.maxItems = options.maxItems ?? 0;
  }

  upsert(items: ContextItem[]): void {
    for (const item of items) {
      // Delete-then-set so re-upserted items move to the most-recent position.
      if (this.items.has(item.id)) this.items.delete(item.id);
      this.items.set(item.id, {
        ...item,
        timestamp: item.timestamp ?? Date.now(),
      });
    }
    this.evict();
  }

  get(id: string): ContextItem | undefined {
    return this.items.get(id);
  }

  all(agentId?: string): ContextItem[] {
    const values = Array.from(this.items.values());
    if (agentId === undefined) return values;
    return values.filter(i => i.agentId === agentId);
  }

  get size(): number {
    return this.items.size;
  }

  /** Remove all items (primarily for tests). */
  clear(): void {
    this.items.clear();
  }

  protected evict(): void {
    if (this.maxItems <= 0) return;
    while (this.items.size > this.maxItems) {
      const oldestKey = this.items.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      this.items.delete(oldestKey);
    }
  }
}
