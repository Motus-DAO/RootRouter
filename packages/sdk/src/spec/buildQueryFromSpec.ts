import { normalizePath } from '../select/pathFilter';
import * as fs from 'fs';
import * as path from 'path';

export interface ParsedSpec {
  title: string | null;
  acceptanceCriteria: string[];
  anchorPaths: string[];
  /** Longest shared directory prefix across anchor paths (monorepo scope hint). */
  pathPrefix: string | null;
}

const PATH_IN_BACKTICKS = /`([^`\n]+\.[a-zA-Z0-9]+)`/g;
const PATH_LIKE =
  /(?:^|[\s(])([\w@./-]+(?:\/[\w@./-]+)+\.(?:tsx?|jsx?|py|md|json|toml|sol|rs|go|vue|svelte|css|scss|yaml|yml))(?:\b|[\s),.:;])/gm;

const AC_HEADING = /^(#{1,3}\s+.*(acceptance|criteria|\bAC\b|requirements)).*$/im;
const BULLET = /^\s*(?:[-*]|\d+[.)])\s+(.+)$/;

/**
 * Extract repo-relative file paths from spec markdown (backticks and bare paths).
 */
export function extractAnchorPaths(specText: string): string[] {
  const found = new Set<string>();

  for (const m of specText.matchAll(PATH_IN_BACKTICKS)) {
    const p = normalizePath(m[1].trim());
    if (looksLikeFilePath(p)) found.add(p);
  }

  for (const m of specText.matchAll(PATH_LIKE)) {
    const p = normalizePath(m[1].trim());
    if (looksLikeFilePath(p)) found.add(p);
  }

  return [...found];
}

function looksLikeFilePath(p: string): boolean {
  return p.includes('/') && !p.startsWith('http') && !p.startsWith('//');
}

/**
 * Pull acceptance-criteria bullets from spec text (section-aware when possible).
 */
export function extractAcceptanceCriteria(specText: string): string[] {
  const lines = specText.split(/\r?\n/);
  const acHeadingIdx = lines.findIndex((l) => AC_HEADING.test(l));
  const start = acHeadingIdx >= 0 ? acHeadingIdx + 1 : 0;
  const criteria: string[] = [];

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (acHeadingIdx >= 0 && /^#{1,3}\s+/.test(line) && i > start) break;
    const m = line.match(BULLET);
    if (!m) continue;
    const text = m[1].trim();
    if (text.length < 4) continue;
    if (/^(given|when|then)\b/i.test(text)) {
      criteria.push(text);
      continue;
    }
    if (
      /\bAC\b/i.test(text) ||
      /\bmust\b/i.test(text) ||
      /\bshould\b/i.test(text) ||
      acHeadingIdx >= 0
    ) {
      criteria.push(text);
    }
  }

  if (criteria.length === 0) {
    for (const line of lines) {
      const m = line.match(BULLET);
      if (m && (/\bAC\s*[\d.]/i.test(m[1]) || /\bacceptance\b/i.test(m[1]))) {
        criteria.push(m[1].trim());
      }
    }
  }

  return criteria.slice(0, 12);
}

export function extractSpecTitle(specText: string): string | null {
  for (const line of specText.split(/\r?\n/)) {
    const m = line.match(/^#\s+(.+)$/);
    if (m) return m[1].trim();
  }
  return null;
}

/** Longest common directory prefix across anchor paths (e.g. apps/academy). */
export function inferPathPrefix(anchorPaths: string[]): string | null {
  if (anchorPaths.length === 0) return null;

  const normalized = anchorPaths.map((p) => normalizePath(p));
  if (normalized.length === 1) {
    const parts = normalized[0].split('/');
    if (parts.length > 1) return parts.slice(0, -1).join('/');
    return null;
  }

  const split = normalized.map((p) => p.split('/'));
  const common: string[] = [];
  const depth = Math.min(...split.map((s) => s.length)) - 1;

  for (let i = 0; i < depth; i++) {
    const seg = split[0][i];
    if (split.every((s) => s[i] === seg)) common.push(seg);
    else break;
  }

  return common.length > 0 ? common.join('/') : null;
}

export function parseSpec(specText: string): ParsedSpec {
  const anchorPaths = extractAnchorPaths(specText);
  return {
    title: extractSpecTitle(specText),
    acceptanceCriteria: extractAcceptanceCriteria(specText),
    anchorPaths,
    pathPrefix: inferPathPrefix(anchorPaths),
  };
}

/**
 * Build a select_context query from spec markdown.
 * Shape: title + acceptance criteria + anchor file names.
 */
export function buildQueryFromSpec(specText: string): string {
  const parsed = parseSpec(specText);
  const parts: string[] = [];

  if (parsed.title) parts.push(parsed.title);

  if (parsed.acceptanceCriteria.length > 0) {
    parts.push(parsed.acceptanceCriteria.slice(0, 6).join('; '));
  }

  if (parsed.anchorPaths.length > 0) {
    const names = parsed.anchorPaths
      .slice(0, 10)
      .map((p) => p.split('/').pop() ?? p);
    parts.push(names.join(', '));
  }

  const query = parts.join(': ').replace(/\s+/g, ' ').trim();
  return query || specText.slice(0, 500).replace(/\s+/g, ' ').trim();
}

/** Whether an indexed chunk path is mentioned in the spec anchor list. */
export function pathMentionedInSpec(itemPath: string, specPaths: string[]): boolean {
  if (specPaths.length === 0) return false;
  const normalized = normalizePath(itemPath);
  const base = normalized.split('/').pop() ?? normalized;

  return specPaths.some((sp) => {
    const n = normalizePath(sp);
    const specBase = n.split('/').pop() ?? n;
    return (
      normalized === n ||
      normalized.endsWith(`/${n}`) ||
      n.endsWith(`/${normalized}`) ||
      base === specBase
    );
  });
}

export function resolveActiveSpecPath(explicit?: string): string | undefined {
  const fromArg = explicit?.trim();
  if (fromArg) return fromArg;
  const fromEnv =
    process.env.ROOTROUTER_ACTIVE_SPEC?.trim() || process.env.MOTUS_ACTIVE_SPEC?.trim();
  return fromEnv || undefined;
}

export function loadSpecText(specPath: string, cwd?: string): string {
  const resolved = path.isAbsolute(specPath)
    ? specPath
    : path.resolve(cwd ?? process.cwd(), specPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Spec not found: ${resolved}`);
  }
  return fs.readFileSync(resolved, 'utf8');
}

export interface SpecSelectionHints {
  query: string;
  pathPrefix: string | null;
  specPaths: string[];
  specPath: string;
  parsed: ParsedSpec;
}

/** Read spec file and derive query + path hints for selection. */
export function buildSelectionFromSpec(specPath: string, cwd?: string): SpecSelectionHints {
  const resolved = path.isAbsolute(specPath)
    ? specPath
    : path.resolve(cwd ?? process.cwd(), specPath);
  const text = loadSpecText(resolved);
  const parsed = parseSpec(text);
  return {
    query: buildQueryFromSpec(text),
    pathPrefix: parsed.pathPrefix,
    specPaths: parsed.anchorPaths,
    specPath: resolved,
    parsed,
  };
}
