import { createHash } from 'crypto';
import { chunkFileContent } from './chunk';
import { extractImports, resolveImportToRelative } from './imports';
import type { RepoNodeMetadata } from './types';
import type { ContextItem } from '../select/types';
import type { ScannedFile } from './walk';

export interface ChunkNode {
  id: string;
  item: ContextItem;
  relativePath: string;
  community: string;
  imports: string[];
}

/** Stable chunk id from repo-relative path and line range. */
export function chunkId(relativePath: string, startLine: number, endLine: number): string {
  return createHash('sha256')
    .update(`${relativePath}:${startLine}:${endLine}`)
    .digest('hex')
    .slice(0, 24);
}

export function buildChunkNodes(
  files: ScannedFile[],
  options: { maxChunkTokens: number; agentId?: string }
): ChunkNode[] {
  const nodes: ChunkNode[] = [];

  for (const file of files) {
    const chunks = chunkFileContent(file.content, options.maxChunkTokens);
    const community = directoryCommunity(file.relativePath);

    for (const chunk of chunks) {
      const id = chunkId(file.relativePath, chunk.startLine, chunk.endLine);
      const imports = extractImports(chunk.text, file.language);
      const metadata: RepoNodeMetadata = {
        nodeType: 'file_chunk',
        path: file.relativePath,
        language: file.language,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        edges: [],
        community,
        degree: 0,
        imports,
      };

      const header = `// ${file.relativePath}:${chunk.startLine}-${chunk.endLine}\n`;
      nodes.push({
        id,
        relativePath: file.relativePath,
        community,
        imports,
        item: {
          id,
          text: header + chunk.text,
          kind: 'file',
          agentId: options.agentId,
          timestamp: Date.now(),
          metadata: metadata as unknown as Record<string, unknown>,
        },
      });
    }
  }

  return nodes;
}

/**
 * Wire import and same-directory edges; compute degree per node.
 */
export function wireEdges(nodes: ChunkNode[]): number {
  const byPath = new Map<string, ChunkNode[]>();
  const filePrimaryId = new Map<string, string>();

  for (const n of nodes) {
    const list = byPath.get(n.relativePath) ?? [];
    list.push(n);
    byPath.set(n.relativePath, list);
    if (!filePrimaryId.has(n.relativePath)) filePrimaryId.set(n.relativePath, n.id);
  }

  let edgeCount = 0;

  for (const node of nodes) {
    const edges = new Set<string>();
    const lang = (node.item.metadata as unknown as RepoNodeMetadata).language;

    for (const spec of node.imports) {
      const rel = resolveImportToRelative(spec, node.relativePath, lang);
      if (!rel) continue;
      const targetId = filePrimaryId.get(rel);
      if (targetId && targetId !== node.id) edges.add(targetId);
    }

    const dir = directoryCommunity(node.relativePath);
    const peers = nodes.filter((p) => p.community === dir && p.id !== node.id).slice(0, 3);
    for (const p of peers) edges.add(p.id);

    const edgeList = Array.from(edges);
    const meta = node.item.metadata as unknown as RepoNodeMetadata;
    meta.edges = edgeList;
    meta.degree = edgeList.length;
    node.item.metadata = meta as unknown as Record<string, unknown>;
    edgeCount += edgeList.length;
  }

  return edgeCount;
}

export function countCommunities(nodes: ChunkNode[]): number {
  return new Set(nodes.map((n) => n.community)).size;
}

export function maxDegree(nodes: ChunkNode[]): number {
  let max = 0;
  for (const n of nodes) {
    const d = (n.item.metadata as unknown as RepoNodeMetadata).degree;
    if (d > max) max = d;
  }
  return max;
}

function directoryCommunity(relativePath: string): string {
  const idx = relativePath.lastIndexOf('/');
  return idx === -1 ? '.' : relativePath.slice(0, idx);
}
