import * as os from 'os';
import * as path from 'path';

/** Runtime personas that share one proxy process + one store file. */
export type ProxyPersona = 'hermes-coo' | 'openclaw-shamy';

export function projectSlugFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'project';
}

/** Single store file per agent persona (not per product/repo). */
export function defaultPersonaProxyStorePath(persona: ProxyPersona): string {
  return path.join(os.homedir(), '.rootrouter', persona, 'proxy-store.json');
}

/**
 * Soft partition inside the persona store.
 * Examples: hermes-coo:brahma101, hermes-coo:default, openclaw-shamy:default
 */
export function scopedProxyAgentId(
  persona: ProxyPersona | string,
  projectSlug?: string | null
): string {
  const slug = projectSlug?.trim();
  if (!slug) return `${persona}:default`;
  return `${persona}:${projectSlugFromName(slug)}`;
}

export const ROOTROUTER_AGENT_ID_HEADER = 'x-rootrouter-agent-id';
