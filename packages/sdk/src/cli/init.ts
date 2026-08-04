import { createRequire as nodeCreateRequire } from 'module';
import {
  defaultProjectAgentId,
  defaultProjectStorePath,
  writeCodexAgentsMd,
  type WriteAgentsMdResult,
} from './agentsMd';
import { initHermes, type InitHermesOptions, type InitHermesResult } from './initHermes';
import { defaultPersonaProxyStorePath, scopedProxyAgentId } from './runtimeStores';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export { initHermes, type InitHermesOptions, type InitHermesResult };
export { defaultPersonaProxyStorePath, scopedProxyAgentId };
export { defaultProjectAgentId, defaultProjectStorePath };

const nodeRequire = nodeCreateRequire(__filename);

export interface InitPaths {
  mcpLaunch: { command: string; args: string[] };
  storePath: string;
  repoPath: string;
}

export function defaultStorePath(): string {
  return path.join(os.homedir(), '.rootrouter', 'store.json');
}

/** Resolve how to spawn the MCP server (local path or npx bin). */
export function resolveMcpLaunch(): { command: string; args: string[] } {
  const fromEnv = process.env.ROOTROUTER_MCP_PATH?.trim();
  if (fromEnv) return { command: 'node', args: [fromEnv] };

  try {
    const pkgJson = nodeRequire.resolve('@rootrouter/mcp/package.json');
    const server = path.join(path.dirname(pkgJson), 'dist/server.js');
    if (fs.existsSync(server)) return { command: 'node', args: [server] };
  } catch {
    /* @rootrouter/mcp not installed */
  }

  const monorepoMcp = path.resolve(__dirname, '../../../mcp/dist/server.js');
  if (fs.existsSync(monorepoMcp)) return { command: 'node', args: [monorepoMcp] };

  const mcpPkg =
    process.env.ROOTROUTER_MCP_PACKAGE?.trim() || '@rootrouter/mcp@beta';
  return { command: 'npx', args: ['-p', mcpPkg, 'rootrouter-mcp'] };
}

export function resolveInitPaths(cwd: string): InitPaths {
  return {
    mcpLaunch: resolveMcpLaunch(),
    storePath: process.env.ROOTROUTER_STORE_PATH?.trim() || defaultStorePath(),
    repoPath: path.resolve(cwd),
  };
}

export interface InitResult {
  target: string;
  created: boolean;
  message: string;
}

export interface InitCursorOptions {
  /** Write EMBEDDING_PROVIDER=local + EMBEDDING_LOCAL_MODEL=minilm into MCP env. */
  localEmbeddings?: boolean;
  /** Optional active spec path written to ROOTROUTER_ACTIVE_SPEC in MCP env. */
  activeSpecPath?: string;
  /** Write RootRouter sections to ~/.codex/AGENTS.md and ./AGENTS.md (codex init). */
  writeAgentsMd?: boolean;
  /**
   * Use ~/.rootrouter/<project>/{cursor|codex}-store.json instead of global default store.
   * Motus / production: always enable for Cursor (avoids multi-repo stews).
   */
  projectStore?: boolean;
  /** agentId for project AGENTS.md and MCP retrieval scoping. */
  projectAgentId?: string;
}

export function resolveProjectAgentId(repoPath: string, options?: InitCursorOptions): string {
  return options?.projectAgentId?.trim() || defaultProjectAgentId(repoPath);
}

export function buildMcpServerEnv(
  paths: InitPaths,
  options?: InitCursorOptions,
  agentId?: string
): Record<string, string> {
  const env: Record<string, string> = {
    ROOTROUTER_STORE_PATH: paths.storePath,
  };
  if (agentId?.trim()) {
    env.ROOTROUTER_DEFAULT_AGENT_ID = agentId.trim();
  }
  if (options?.localEmbeddings) {
    env.EMBEDDING_PROVIDER = 'local';
    env.EMBEDDING_LOCAL_MODEL = 'minilm';
  } else {
    env.EMBEDDING_PROVIDER = 'tfidf';
  }
  if (options?.activeSpecPath?.trim()) {
    env.ROOTROUTER_ACTIVE_SPEC = options.activeSpecPath.trim();
  }
  return env;
}

export function initCursor(
  cwd: string,
  paths: InitPaths,
  options?: InitCursorOptions
): InitResult & { storePath: string; agentId: string } {
  if (options?.projectStore) {
    paths.storePath = defaultProjectStorePath(paths.repoPath, 'cursor');
  }
  fs.mkdirSync(path.dirname(paths.storePath), { recursive: true });
  if (!fs.existsSync(paths.storePath)) {
    fs.writeFileSync(paths.storePath, `${JSON.stringify({ items: [] }, null, 2)}\n`, 'utf8');
  }

  const agentId = resolveProjectAgentId(paths.repoPath, options);
  const cursorDir = path.join(cwd, '.cursor');
  const configPath = path.join(cursorDir, 'mcp.json');

  const entry = {
    command: paths.mcpLaunch.command,
    args: paths.mcpLaunch.args,
    env: buildMcpServerEnv(paths, options, agentId),
  };

  let config: { mcpServers: Record<string, unknown> } = { mcpServers: {} };
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as typeof config;
      if (!config.mcpServers) config.mcpServers = {};
    } catch {
      config = { mcpServers: {} };
    }
  }

  config.mcpServers.rootrouter = entry;
  fs.mkdirSync(cursorDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

  const ruleResult = writeCursorRootRouterRule(cwd, {
    storePath: paths.storePath,
    agentId,
  });

  return {
    target: configPath,
    created: true,
    storePath: paths.storePath,
    agentId,
    message:
      `Wrote Cursor MCP config at ${configPath}` +
      (options?.projectStore ? ` (project store: ${paths.storePath})` : ' (global/default store — demos only)') +
      (ruleResult ? `; ${ruleResult}` : ''),
  };
}

export interface WriteCursorRuleOptions {
  storePath?: string;
  agentId?: string;
}

/** Install `.cursor/rules/rootrouter-mcp.mdc` so agents use MCP without manual prompting. */
export function writeCursorRootRouterRule(
  cwd: string,
  options?: WriteCursorRuleOptions
): string | null {
  const rulesDir = path.join(cwd, '.cursor', 'rules');
  const rulePath = path.join(rulesDir, 'rootrouter-mcp.mdc');
  const templateCandidates = [
    path.resolve(__dirname, '../../templates/cursor-rootrouter-mcp-rule.mdc'),
    path.resolve(__dirname, '../../../../docs/templates/cursor-rootrouter-mcp-rule.mdc'),
  ];

  let content: string | null = null;
  for (const candidate of templateCandidates) {
    if (fs.existsSync(candidate)) {
      content = fs.readFileSync(candidate, 'utf8');
      break;
    }
  }
  if (!content) return null;

  const agentId = options?.agentId?.trim() || 'repo';
  const storePath = options?.storePath?.trim() || defaultStorePath();
  content = content
    .replaceAll('{{AGENT_ID}}', agentId)
    .replaceAll('{{STORE_PATH}}', storePath);

  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(rulePath, content, 'utf8');
  return `wrote agent rule at ${rulePath}`;
}

function formatTomlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Replace the RootRouter MCP table family without disturbing unrelated Codex config. */
function upsertRootRouterMcpBlock(configPath: string, block: string): boolean {
  const existed = fs.existsSync(configPath);
  const existing = existed ? fs.readFileSync(configPath, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  const kept: string[] = [];
  let skippingRootRouter = false;

  for (const line of lines) {
    const header = line.trim().match(/^\[([^\]]+)\]$/)?.[1];
    if (header) {
      if (header === 'mcp_servers.rootrouter' || header.startsWith('mcp_servers.rootrouter.')) {
        skippingRootRouter = true;
        continue;
      }
      skippingRootRouter = false;
    }
    if (!skippingRootRouter) kept.push(line);
  }

  const prefix = kept.join('\n').trimEnd();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${prefix}${prefix ? '\n' : ''}${block.trimStart()}`, 'utf8');
  return !existed;
}

export function initCodex(
  cwd: string,
  paths: InitPaths,
  options?: InitCursorOptions
): InitResult & { agentsMd?: WriteAgentsMdResult } {
  if (options?.projectStore) {
    paths.storePath = defaultProjectStorePath(paths.repoPath, 'codex');
  }
  fs.mkdirSync(path.dirname(paths.storePath), { recursive: true });
  const agentId = resolveProjectAgentId(paths.repoPath, options);

  // Project stores need project-scoped MCP configuration; otherwise every repo
  // would inherit whichever store was written to the global config most recently.
  const configPath = options?.projectStore
    ? path.join(cwd, '.codex', 'config.toml')
    : path.join(os.homedir(), '.codex', 'config.toml');
  const argsToml =
    paths.mcpLaunch.args.length === 0
      ? '[]'
      : `[${paths.mcpLaunch.args.map((a) => formatTomlString(a)).join(', ')}]`;

  const envLines = Object.entries(buildMcpServerEnv(paths, options, agentId)).map(
    ([key, value]) => `${key} = ${formatTomlString(value)}`
  );

  const block = [
    '',
    '[mcp_servers.rootrouter]',
    `command = ${formatTomlString(paths.mcpLaunch.command)}`,
    `args = ${argsToml}`,
    '',
    '[mcp_servers.rootrouter.env]',
    ...envLines,
    '',
  ].join('\n');

  const configCreated = upsertRootRouterMcpBlock(configPath, block);

  let agentsMd: WriteAgentsMdResult | undefined;
  if (options?.writeAgentsMd) {
    agentsMd = writeCodexAgentsMd(cwd, {
      repoPath: paths.repoPath,
      storePath: paths.storePath,
      agentId,
      activeSpecPath: options.activeSpecPath,
    });
  }

  return {
    target: configPath,
    created: configCreated,
    message: `${configCreated ? 'Wrote' : 'Updated'} RootRouter MCP block in ${configPath}`,
    agentsMd,
  };
}

export function proxyEnvSnippet(paths: InitPaths): string {
  return [
    '# RootRouter transparent proxy (optional — zero agent code changes)',
    'export ROOTROUTER_STORE_PATH="' + paths.storePath + '"',
    'export ROOTROUTER_REPO_PATH="' + paths.repoPath + '"',
    'export ROOTROUTER_MIN_TOKENS_TO_FILTER=6000',
    'export ROOTROUTER_CONTEXT_BUDGET=4000',
    '# npx -p @rootrouter/proxy@beta rootrouter-proxy',
    '# Point your agent base_url at http://localhost:8787 (path depends on provider)',
  ].join('\n');
}
