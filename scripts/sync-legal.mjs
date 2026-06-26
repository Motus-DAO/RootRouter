#!/usr/bin/env node
import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['LICENSE', 'NOTICE', 'COMMERCIAL.md', 'BETA.md'];
const packages = ['packages/sdk', 'packages/proxy', 'packages/mcp'];

for (const pkg of packages) {
  const destDir = join(root, pkg);
  mkdirSync(destDir, { recursive: true });
  for (const file of files) {
    copyFileSync(join(root, file), join(destDir, file));
  }
}

console.log('Synced legal files to packages/sdk, packages/proxy, packages/mcp');
