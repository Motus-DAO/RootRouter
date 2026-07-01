import * as path from 'path';
import type { ContextItem } from '../select/types';
import type { IndexRepoOptions, IndexRepoResult } from './types';
import { walkRepo } from './walk';
import { buildChunkNodes, countCommunities, maxDegree, wireEdges } from './graph';

const DEFAULT_MAX_FILE_BYTES = 256_000;
const DEFAULT_MAX_CHUNK_TOKENS = 400;

/**
 * Index a repository into ContextItems suitable for ContextEngine / RepoGraph selection.
 *
 * Walks the repo, chunks files, extracts import edges, assigns directory communities,
 * and computes structural degree for hub boosting at selection time.
 */
export function indexRepo(options: IndexRepoOptions): IndexRepoResult {
  const start = Date.now();
  const rootPath = path.resolve(options.rootPath);
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxChunkTokens = options.maxChunkTokens ?? DEFAULT_MAX_CHUNK_TOKENS;

  const files = walkRepo(rootPath, {
    maxFileBytes,
    extensions: options.extensions,
    ignoreDirs: options.ignoreDirs,
  });

  const nodes = buildChunkNodes(files, {
    maxChunkTokens,
    agentId: options.agentId,
    rootPath,
  });

  const edgesCreated = wireEdges(nodes);
  const items: ContextItem[] = nodes.map((n) => n.item);

  return {
    items,
    stats: {
      filesScanned: files.length,
      chunksIndexed: items.length,
      edgesCreated,
      communities: countCommunities(nodes),
      maxDegree: maxDegree(nodes),
      rootPath,
      durationMs: Date.now() - start,
    },
  };
}
