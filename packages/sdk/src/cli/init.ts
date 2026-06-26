import { createRequire as nodeCreateRequire } from 'module';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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

  return { command: 'npx', args: ['rootrouter-mcp'] };
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

export function initCursor(cwd: string, paths: InitPaths): InitResult {
  const cursorDir = path.join(cwd, '.cursor');
  const configPath = path.join(cursorDir, 'mcp.json');

  const entry = {
    command: paths.mcpLaunch.command,
    args: paths.mcpLaunch.args,
    env: {
      ROOTROUTER_STORE_PATH: paths.storePath,
    },
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

  return {
    target: configPath,
    created: true,
    message: `Wrote Cursor MCP config at ${configPath}`,
  };
}

function formatTomlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function initCodex(paths: InitPaths): InitResult {
  const configPath = path.join(os.homedir(), '.codex', 'config.toml');
  const argsToml =
    paths.mcpLaunch.args.length === 0
      ? '[]'
      : `[${paths.mcpLaunch.args.map((a) => formatTomlString(a)).join(', ')}]`;

  const block = [
    '',
    '[mcp_servers.rootrouter]',
    `command = ${formatTomlString(paths.mcpLaunch.command)}`,
    `args = ${argsToml}`,
    '',
    '[mcp_servers.rootrouter.env]',
    `ROOTROUTER_STORE_PATH = ${formatTomlString(paths.storePath)}`,
    '',
  ].join('\n');

  if (fs.existsSync(configPath)) {
    const existing = fs.readFileSync(configPath, 'utf8');
    if (existing.includes('[mcp_servers.rootrouter]')) {
      return {
        target: configPath,
        created: false,
        message:
          `[mcp_servers.rootrouter] already exists in ${configPath} — update paths manually if needed.`,
      };
    }
    fs.appendFileSync(configPath, block, 'utf8');
  } else {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, block.trimStart(), 'utf8');
  }

  return {
    target: configPath,
    created: true,
    message: `Wrote RootRouter MCP block to ${configPath}`,
  };
}

export function proxyEnvSnippet(paths: InitPaths): string {
  return [
    '# RootRouter transparent proxy (optional — zero agent code changes)',
    'export ROOTROUTER_STORE_PATH="' + paths.storePath + '"',
    'export ROOTROUTER_REPO_PATH="' + paths.repoPath + '"',
    'export ROOTROUTER_MIN_TOKENS_TO_FILTER=6000',
    'export ROOTROUTER_CONTEXT_BUDGET=4000',
    '# npx rootrouter-proxy',
    '# Point your agent base_url at http://localhost:8787 (path depends on provider)',
  ].join('\n');
}
