#!/usr/bin/env node
/**
 * RootRouter CLI
 *
 *   rootrouter index <path> [--store <file>] [--agent <id>]
 */
import * as path from 'path';
import { indexRepo } from '../repo';
import { ContextEngine, FileContextStore } from '../select';

function parseArgs(argv: string[]): {
  command: string;
  repoPath: string;
  storePath?: string;
  agentId?: string;
} {
  const args = argv.slice(2);
  const command = args[0] ?? '';
  let repoPath = '.';
  let storePath: string | undefined;
  let agentId: string | undefined;

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--store' && args[i + 1]) {
      storePath = args[++i];
    } else if (a === '--agent' && args[i + 1]) {
      agentId = args[++i];
    } else if (!a.startsWith('-')) {
      repoPath = a;
    }
  }

  return { command, repoPath, storePath, agentId };
}

async function main(): Promise<void> {
  const { command, repoPath, storePath, agentId } = parseArgs(process.argv);

  if (command !== 'index') {
    console.error('Usage: rootrouter index <repo-path> [--store <store.json>] [--agent <id>]');
    process.exit(command === '--help' || command === '-h' || !command ? 0 : 1);
  }

  const resolved = path.resolve(repoPath);
  const result = indexRepo({ rootPath: resolved, agentId: agentId ?? 'repo' });

  const storeFile = storePath ?? process.env.ROOTROUTER_STORE_PATH;
  if (storeFile) {
    const engine = new ContextEngine({
      store: new FileContextStore({ filePath: storeFile }),
    });
    await engine.load();
    engine.record(result.items);
    await engine.save();
    console.error(`[rootrouter] upserted ${result.items.length} chunks -> ${storeFile}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        rootPath: result.stats.rootPath,
        filesScanned: result.stats.filesScanned,
        chunksIndexed: result.stats.chunksIndexed,
        edgesCreated: result.stats.edgesCreated,
        communities: result.stats.communities,
        maxDegree: result.stats.maxDegree,
        durationMs: result.stats.durationMs,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('[rootrouter] fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
