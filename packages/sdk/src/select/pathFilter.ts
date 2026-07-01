import type { ContextItem } from './types';

/** Normalize a repo-relative path for prefix matching. */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}

export function normalizePathList(prefixes?: string | string[]): string[] {
  if (!prefixes) return [];
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  return list.map(normalizePath).filter(Boolean);
}

export function itemPath(item: ContextItem): string | undefined {
  const p = item.metadata?.path;
  return typeof p === 'string' ? normalizePath(p) : undefined;
}

/**
 * Keep items without metadata.path (messages, tool output).
 * Apply excludePaths first, then require a pathPrefix match when prefixes are set.
 */
export function matchesPathFilter(
  item: ContextItem,
  pathPrefix?: string | string[],
  excludePaths?: string | string[]
): boolean {
  const prefixes = normalizePathList(pathPrefix);
  const excludes = normalizePathList(excludePaths);
  const itemP = itemPath(item);

  if (!itemP) return true;

  if (excludes.some((ex) => itemP === ex || itemP.startsWith(`${ex}/`))) {
    return false;
  }

  if (prefixes.length === 0) return true;
  return prefixes.some((pre) => itemP === pre || itemP.startsWith(`${pre}/`));
}

export function filterCandidatesByPath(
  candidates: ContextItem[],
  pathPrefix?: string | string[],
  excludePaths?: string | string[]
): { filtered: ContextItem[]; pathFiltered: number } {
  const prefixes = normalizePathList(pathPrefix);
  const excludes = normalizePathList(excludePaths);
  if (prefixes.length === 0 && excludes.length === 0) {
    return { filtered: candidates, pathFiltered: 0 };
  }

  const filtered = candidates.filter((c) => matchesPathFilter(c, pathPrefix, excludePaths));
  return { filtered, pathFiltered: candidates.length - filtered.length };
}
