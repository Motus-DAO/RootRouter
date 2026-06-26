import * as os from 'os';
import * as path from 'path';
import {
  ContextEngine,
  FileContextStore,
  ApiEmbeddingProvider,
  type EmbeddingProvider,
} from 'rootrouter';

let engine: ContextEngine | null = null;

export function resolveStorePath(): string {
  const fromEnv = process.env.ROOTROUTER_STORE_PATH;
  if (fromEnv?.trim()) return fromEnv;
  return path.join(os.homedir(), '.rootrouter', 'store.json');
}

function buildProvider(): EmbeddingProvider | undefined {
  const apiKey = process.env.EMBEDDING_API_KEY;
  if (!apiKey) return undefined;
  return new ApiEmbeddingProvider({
    embeddingApiKey: apiKey,
    embeddingApiUrl: process.env.EMBEDDING_API_URL ?? 'https://api.openai.com/v1/embeddings',
    embeddingModel: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
    embeddingDimension: Number(process.env.EMBEDDING_DIMENSION ?? 128),
  });
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
      provider: buildProvider(),
      useChambers: (process.env.ROOTROUTER_USE_CHAMBERS ?? 'false').toLowerCase() === 'true',
    });
  }
  return engine;
}

export async function initEngine(): Promise<void> {
  await getEngine().load();
}
