import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
  'graphify-out',
  '.rootrouter',
]);

const DEFAULT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.md', '.mdx',
]);

/**
 * Resolve and jail a path to the repository root. Throws if the resolved path
 * escapes the root (path traversal defense).
 */
export function resolveJailedPath(repoRoot: string, relativeOrAbs: string): string {
  const root = path.resolve(repoRoot);
  const target = path.resolve(root, relativeOrAbs);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`Path escapes repository root: ${relativeOrAbs}`);
  }
  return target;
}

export function isIgnoredDir(dirName: string, extra: string[] = []): boolean {
  if (dirName.startsWith('.')) return dirName !== '.';
  const all = new Set([...DEFAULT_IGNORE_DIRS, ...extra]);
  return all.has(dirName);
}

export function isAllowedExtension(filePath: string, extensions?: string[]): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const allowed = extensions
    ? new Set(extensions.map((e) => (e.startsWith('.') ? e : `.${e}`).toLowerCase()))
    : DEFAULT_EXTENSIONS;
  return allowed.has(ext);
}

export function readFileSafe(filePath: string, maxBytes: number): string | null {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > maxBytes) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}
