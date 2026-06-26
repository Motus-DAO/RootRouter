import * as path from 'path';
import type { RepoLanguage } from './types';

/**
 * Extract import specifiers from source text (MVP: regex-based, no AST).
 * Returns raw module strings as they appear in source.
 */
export function extractImports(content: string, language: RepoLanguage): string[] {
  const found = new Set<string>();

  if (language === 'typescript' || language === 'javascript') {
    const patterns = [
      /\bimport\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g,
      /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /\bexport\s+(?:\*|{[^}]*})\s+from\s+['"]([^'"]+)['"]/g,
    ];
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        if (m[1]) found.add(m[1]);
      }
    }
  } else if (language === 'python') {
    const patterns = [
      /^\s*import\s+([\w.]+)/gm,
      /^\s*from\s+([\w.]+)\s+import\b/gm,
    ];
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        if (m[1]) found.add(m[1]);
      }
    }
  }

  return Array.from(found);
}

/** Map an import specifier to a candidate repo-relative file path, or null if external. */
export function resolveImportToRelative(
  specifier: string,
  fromFile: string,
  language: RepoLanguage
): string | null {
  if (!specifier || specifier.startsWith('node:')) return null;

  if (language === 'typescript' || language === 'javascript') {
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
      // Package import — skip for MVP unless path alias (no tsconfig resolution yet).
      return null;
    }
    const fromDir = path.dirname(fromFile);
    let resolved = path.normalize(path.join(fromDir, specifier));
    if (!resolved.startsWith('.')) resolved = `./${resolved}`;
    return tryExtensions(resolved);
  }

  if (language === 'python') {
    if (specifier.includes('.')) {
      const parts = specifier.split('.');
      return tryExtensions(path.join(...parts));
    }
    return tryExtensions(specifier);
  }

  return null;
}

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', ''];

function tryExtensions(base: string): string {
  if (path.extname(base)) return base.replace(/\\/g, '/');
  for (const ext of CODE_EXTENSIONS) {
    if (ext === '') continue;
    const candidate = `${base}${ext}`;
    if (!candidate.includes('..')) return candidate.replace(/\\/g, '/');
  }
  return `${base}.ts`.replace(/\\/g, '/');
}

export function detectLanguage(filePath: string): RepoLanguage {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ts' || ext === '.tsx') return 'typescript';
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') return 'javascript';
  if (ext === '.py') return 'python';
  if (ext === '.md' || ext === '.mdx') return 'markdown';
  return 'other';
}
