import { loadConfig, type RouterConfig } from 'rootrouter';

/** Map proxy upstream origin to an LLM base URL for catalog auto-detection. */
export function upstreamToLlmBaseUrl(upstreamOrigin: string): string {
  const origin = upstreamOrigin.replace(/\/$/, '').toLowerCase();
  if (origin.includes('venice.ai')) {
    return origin.includes('/api/') ? origin : `${origin}/api/v1`;
  }
  if (origin.includes('openrouter.ai')) {
    return origin.includes('/api/') ? origin : `${origin}/api/v1`;
  }
  return origin.includes('/api/') ? origin : `${origin}/api/v1`;
}

let cachedConfig: RouterConfig | null = null;
let cachedUpstream: string | null = null;

/** SDK routing config with upstream-aligned llmBaseUrl (env MODEL_CATALOG, MODEL_*, etc.). */
export function getProxyRoutingConfig(upstreamOrigin: string): RouterConfig {
  const normalized = upstreamOrigin.replace(/\/$/, '');
  if (cachedConfig && cachedUpstream === normalized) return cachedConfig;
  cachedConfig = loadConfig({ llmBaseUrl: upstreamToLlmBaseUrl(normalized) });
  cachedUpstream = normalized;
  return cachedConfig;
}

/** Clear config cache (tests). */
export function resetProxyRoutingConfigCache(): void {
  cachedConfig = null;
  cachedUpstream = null;
}

export function isModelRoutingEnabled(): boolean {
  const raw = process.env.ROOTROUTER_MODEL_ROUTING?.trim().toLowerCase();
  return raw === 'true' || raw === '1';
}
