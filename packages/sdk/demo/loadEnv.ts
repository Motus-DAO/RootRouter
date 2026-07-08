import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

/** Load repo-root .env.local then .env (for live API benchmarks). */
export function loadRepoEnv(): void {
  const repoRoot = path.resolve(__dirname, '../../..');
  for (const name of ['.env.local', '.env']) {
    const file = path.join(repoRoot, name);
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override: false });
    }
  }
}
