import { ContextItem, ContextStore } from './types';
import { ContextEngine } from './contextEngine';
import { FileContextStore } from './store/fileStore';

/** Context-engine stats for dashboard / Convex snapshots. */
export interface SelectionStats {
  items: number;
  selections: number;
  totalTokensSaved: number;
  chambersEnabled: boolean;
  chambersFitted: boolean;
}

export interface RepoGraphCommunity {
  community: string;
  count: number;
}

export interface RepoGraphNode {
  id: string;
  path?: string;
  community?: string;
  degree?: number;
}

export interface RepoGraphEdge {
  source: string;
  target: string;
}

/** RepoGraph summary derived from indexed file chunks in the store. */
export interface RepoGraphSnapshot {
  nodeCount: number;
  edgeCount: number;
  communities: RepoGraphCommunity[];
  nodes: RepoGraphNode[];
  edges: RepoGraphEdge[];
}

export interface SelectionSnapshot {
  selectionStats: SelectionStats;
  repoGraph?: RepoGraphSnapshot;
}

export function buildSelectionStats(stats: {
  items: number;
  selections: number;
  totalTokensSaved: number;
  chambersEnabled: boolean;
  chambersFitted: boolean;
}): SelectionStats {
  return { ...stats };
}

/** Build selection + repo graph snapshot from a context store. */
export function buildSelectionSnapshot(
  store: ContextStore,
  stats: SelectionStats
): SelectionSnapshot {
  const items = store.all();
  const repoGraph = buildRepoGraphSnapshot(items);
  return {
    selectionStats: stats,
    ...(repoGraph.nodeCount > 0 ? { repoGraph } : {}),
  };
}

/** Merge selection/repo stats into a dashboard snapshot payload when a store path is set. */
export async function attachSelectionSnapshot(
  payload: { snapshot: Record<string, unknown> },
  storePath?: string
): Promise<void> {
  const file = storePath ?? process.env.ROOTROUTER_STORE_PATH;
  if (!file) return;

  const engine = new ContextEngine({ store: new FileContextStore({ filePath: file }) });
  await engine.load();
  const sel = buildSelectionSnapshot(engine.getStore(), engine.stats());
  Object.assign(payload.snapshot, sel);
}

function buildRepoGraphSnapshot(items: ContextItem[]): RepoGraphSnapshot {
  const fileItems = items.filter(
    (i) => i.kind === 'file' || (Array.isArray(i.metadata?.edges) && i.metadata!.edges.length > 0)
  );
  if (fileItems.length === 0) {
    return { nodeCount: 0, edgeCount: 0, communities: [], nodes: [], edges: [] };
  }

  const idSet = new Set(fileItems.map((i) => i.id));
  const communityCounts = new Map<string, number>();
  const nodes: RepoGraphNode[] = [];
  const edgeSet = new Set<string>();
  const edges: RepoGraphEdge[] = [];

  for (const item of fileItems) {
    const community = String(item.metadata?.community ?? '');
    if (community) communityCounts.set(community, (communityCounts.get(community) ?? 0) + 1);
    nodes.push({
      id: item.id,
      path: item.metadata?.path as string | undefined,
      community: community || undefined,
      degree: Number(item.metadata?.degree ?? 0) || undefined,
    });
    const rawEdges = item.metadata?.edges as string[] | undefined;
    if (!rawEdges) continue;
    for (const target of rawEdges) {
      if (!idSet.has(target)) continue;
      const key = `${item.id}\0${target}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ source: item.id, target });
    }
  }

  const communities = [...communityCounts.entries()]
    .map(([community, count]) => ({ community, count }))
    .sort((a, b) => b.count - a.count);

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    communities,
    nodes: nodes.slice(0, 500),
    edges: edges.slice(0, 2000),
  };
}
