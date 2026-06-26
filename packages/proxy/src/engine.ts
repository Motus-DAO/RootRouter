import * as os from 'os';
import * as path from 'path';
import {
  ContextEngine,
  FileContextStore,
  buildEmbeddingProviderFromEnv,
  indexRepo,
} from 'rootrouter';

let engine: ContextEngine | null = null;

export function resolveStorePath(): string {
  const fromEnv = process.env.ROOTROUTER_STORE_PATH;
  if (fromEnv?.trim()) return fromEnv;
  return path.join(os.homedir(), '.rootrouter', 'store.json');
}

/** Shared ContextEngine for the proxy process (file-backed, survives restarts). */
export function getEngine(): ContextEngine {
  if (!engine) {
    const maxItems = Number(process.env.ROOTROUTER_MAX_ITEMS ?? 0);
    engine = new ContextEngine({
      store: new FileContextStore({
        filePath: resolveStorePath(),
        maxItems: maxItems > 0 ? maxItems : undefined,
      }),
      provider: buildEmbeddingProviderFromEnv(),
      useChambers: (process.env.ROOTROUTER_USE_CHAMBERS ?? 'false').toLowerCase() === 'true',
    });
  }
  return engine;
}

export async function initEngine(): Promise<void> {
  const eng = getEngine();
  await eng.load();

  const repoPath = process.env.ROOTROUTER_REPO_PATH?.trim();
  if (repoPath) {
    try {
      const result = indexRepo({ rootPath: repoPath, agentId: 'repo' });
      eng.record(result.items);
      await eng.save();
      console.error(
        `[rootrouter-proxy] indexed repo ${result.stats.rootPath}: ` +
          `${result.stats.chunksIndexed} chunks, ${result.stats.edgesCreated} edges`
      );
    } catch (err) {
      console.error(
        '[rootrouter-proxy] repo index skipped:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}
