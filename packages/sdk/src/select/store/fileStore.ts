import * as fs from 'fs';
import * as path from 'path';
import { ContextItem } from '../types';
import { InMemoryContextStore, InMemoryStoreOptions } from './inMemoryStore';

export interface FileStoreOptions extends InMemoryStoreOptions {
  /** Absolute or relative path to the JSON file backing this store. */
  filePath: string;
  /** Load existing contents from disk on construction. Default true. */
  loadOnInit?: boolean;
}

export interface PersistedEngineStats {
  totalSelections: number;
  totalTokensSaved: number;
}

interface PersistedShape {
  version: number;
  items: ContextItem[];
  engineStats?: PersistedEngineStats;
}

const PERSIST_VERSION = 1;

/**
 * File-backed context store. Persists items as JSON so state survives across process
 * invocations — required for the MCP server, which is spawned per session by the host.
 *
 * Writes are synchronous and atomic (temp file + rename) to avoid partial files when
 * multiple short-lived processes touch the same path.
 */
export class FileContextStore extends InMemoryContextStore {
  private filePath: string;
  private engineStats: PersistedEngineStats = { totalSelections: 0, totalTokensSaved: 0 };

  constructor(options: FileStoreOptions) {
    super(options);
    this.filePath = options.filePath;
    if (options.loadOnInit !== false) {
      this.load();
    }
  }

  load(): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf8');
      if (!raw.trim()) return;
      const parsed = JSON.parse(raw) as PersistedShape | ContextItem[];
      const items = Array.isArray(parsed) ? parsed : parsed.items ?? [];
      const stats = Array.isArray(parsed) ? undefined : parsed.engineStats;
      this.items.clear();
      for (const item of items) {
        if (item && typeof item.id === 'string' && typeof item.text === 'string') {
          this.items.set(item.id, item);
        }
      }
      if (stats && typeof stats.totalSelections === 'number' && typeof stats.totalTokensSaved === 'number') {
        this.engineStats = {
          totalSelections: stats.totalSelections,
          totalTokensSaved: stats.totalTokensSaved,
        };
      } else {
        this.engineStats = { totalSelections: 0, totalTokensSaved: 0 };
      }
      this.evict();
    } catch (err) {
      // Corrupt or unreadable store should not crash the host; start fresh.
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[FileContextStore] failed to load ${this.filePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  save(): void {
    const dir = path.dirname(this.filePath);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const payload: PersistedShape = {
      version: PERSIST_VERSION,
      items: this.all(),
      engineStats: this.engineStats,
    };
    const tmp = `${this.filePath}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8');
    fs.renameSync(tmp, this.filePath);
  }

  getEngineStats(): PersistedEngineStats {
    return { ...this.engineStats };
  }

  setEngineStats(stats: PersistedEngineStats): void {
    this.engineStats = {
      totalSelections: stats.totalSelections,
      totalTokensSaved: stats.totalTokensSaved,
    };
  }
}
