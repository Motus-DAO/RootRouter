import * as fs from 'fs';
import * as path from 'path';
import { detectLanguage } from './imports';
import { isAllowedExtension, isIgnoredDir, readFileSafe, resolveJailedPath } from './security';
import type { RepoLanguage } from './types';

export interface ScannedFile {
  relativePath: string;
  language: RepoLanguage;
  content: string;
}

export function walkRepo(
  rootPath: string,
  options: {
    maxFileBytes: number;
    extensions?: string[];
    ignoreDirs?: string[];
  }
): ScannedFile[] {
  const root = path.resolve(rootPath);
  const files: ScannedFile[] = [];

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (isIgnoredDir(ent.name, options.ignoreDirs)) continue;
        walk(full);
        continue;
      }
      if (!ent.isFile()) continue;

      const rel = path.relative(root, full).replace(/\\/g, '/');
      try {
        resolveJailedPath(root, rel);
      } catch {
        continue;
      }

      if (!isAllowedExtension(rel, options.extensions)) continue;
      const content = readFileSafe(full, options.maxFileBytes);
      if (content === null) continue;

      files.push({
        relativePath: rel,
        language: detectLanguage(rel),
        content,
      });
    }
  }

  walk(root);
  return files;
}
