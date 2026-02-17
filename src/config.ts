import * as dotenv from 'dotenv';
import { RouterConfig } from './types';

dotenv.config();

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function envNum(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined) return fallback;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

function envBool(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) return fallback;
  return val.toLowerCase() === 'true' || val === '1';
}

export function loadConfig(overrides?: Partial<RouterConfig>): RouterConfig {
  const config: RouterConfig = {
    models: {
      fast: env('MODEL_FAST', 'anthropic/claude-haiku-4.5'),
      balanced: env('MODEL_BALANCED', 'anthropic/claude-sonnet-4.5'),
      powerful: env('MODEL_POWERFUL', 'anthropic/claude-opus-4.6'),
      costPer1MInput: { fast: 0.80, balanced: 3.00, powerful: 15.00 },
      costPer1MOutput: { fast: 4.00, balanced: 15.00, powerful: 75.00 },
    },

    easyNormThreshold: envNum('EASY_NORM_THRESHOLD', 0.3),
    mediumNormThreshold: envNum('MEDIUM_NORM_THRESHOLD', 0.6),

    maxContextTokens: envNum('MAX_CONTEXT_TOKENS', 4096),
    reflectionContextEnabled: true,

    pcaDimensions: envNum('PCA_DIMENSIONS', 8),
    chamberCount: envNum('CHAMBER_COUNT', 8),
    minInteractionsBeforeFit: envNum('MIN_INTERACTIONS_BEFORE_FIT', 15),
    refitInterval: envNum('REFIT_INTERVAL', 20),

    topicSimilarityThreshold: 0.7,
    maxGraphNeighborDepth: 2,

    useLocalEmbeddings: envBool('USE_LOCAL_EMBEDDINGS', true),
    embeddingModel: env('EMBEDDING_MODEL', 'text-embedding-3-small'),
    embeddingApiUrl: env('EMBEDDING_API_URL', 'https://api.openai.com/v1/embeddings'),
    embeddingApiKey: env('EMBEDDING_API_KEY', ''),
    embeddingDimension: envNum('EMBEDDING_DIMENSION', 128),

    llmBaseUrl: env('LLM_BASE_URL', 'https://openrouter.ai/api/v1'),
    llmApiKey: env('LLM_API_KEY', ''),

    celoRpcUrl: env('CELO_RPC_URL', 'https://alfajores-forno.celo-testnet.org'),
    celoPrivateKey: env('CELO_PRIVATE_KEY', ''),
    telemetryContractAddress: env('TELEMETRY_CONTRACT_ADDRESS', ''),

    verbose: envBool('VERBOSE', false),
  };

  if (overrides) {
    return { ...config, ...overrides };
  }
  return config;
}

export const defaultConfig = loadConfig();
