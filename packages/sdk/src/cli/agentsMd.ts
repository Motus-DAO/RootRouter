import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ROOTROUTER_BEGIN = '<!-- rootrouter:begin -->';
const ROOTROUTER_END = '<!-- rootrouter:end -->';

export function projectSlug(repoPath: string): string {
  const base = path.basename(path.resolve(repoPath));
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'project';
}

export function defaultProjectStorePath(
  repoPath: string,
  runtime: 'codex' | 'proxy' = 'codex'
): string {
  return path.join(os.homedir(), '.rootrouter', projectSlug(repoPath), `${runtime}-store.json`);
}

export function defaultProjectAgentId(repoPath: string): string {
  return projectSlug(repoPath);
}

function loadTemplate(name: string): string | null {
  const candidates = [
    path.resolve(__dirname, '../../templates', name),
    path.resolve(__dirname, '../../../../docs/templates', name),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
  }
  return null;
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

function mergeRootRouterSection(filePath: string, sectionBody: string): string {
  const wrapped = `${ROOTROUTER_BEGIN}\n${sectionBody.trim()}\n${ROOTROUTER_END}`;
  if (!fs.existsSync(filePath)) {
    return `# Agent instructions\n\n${wrapped}\n`;
  }

  const existing = fs.readFileSync(filePath, 'utf8');
  const begin = existing.indexOf(ROOTROUTER_BEGIN);
  const end = existing.indexOf(ROOTROUTER_END);

  if (begin >= 0 && end > begin) {
    return existing.slice(0, begin) + wrapped + existing.slice(end + ROOTROUTER_END.length);
  }

  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  return `${existing}${separator}${wrapped}\n`;
}

export interface WriteAgentsMdOptions {
  repoPath: string;
  storePath: string;
  agentId?: string;
  activeSpecPath?: string;
}

export interface WriteAgentsMdResult {
  globalPath: string;
  projectPath: string;
  globalCreated: boolean;
  projectCreated: boolean;
}

/** Write or update RootRouter sections in ~/.codex/AGENTS.md and ./AGENTS.md. */
export function writeCodexAgentsMd(cwd: string, options: WriteAgentsMdOptions): WriteAgentsMdResult {
  const globalTemplate = loadTemplate('codex-global-agents-rootrouter.md');
  const projectTemplate = loadTemplate('codex-project-agents-rootrouter.md');
  if (!globalTemplate || !projectTemplate) {
    throw new Error('RootRouter AGENTS.md templates not found');
  }

  const agentId = options.agentId?.trim() || defaultProjectAgentId(options.repoPath);
  const activeSpec = options.activeSpecPath?.trim() || '(set ROOTROUTER_ACTIVE_SPEC or path here)';
  const repoPath = path.resolve(options.repoPath);
  const storePath = path.resolve(options.storePath);

  fs.mkdirSync(path.dirname(storePath), { recursive: true });

  const globalPath = path.join(os.homedir(), '.codex', 'AGENTS.md');
  const globalExisted = fs.existsSync(globalPath);
  fs.mkdirSync(path.dirname(globalPath), { recursive: true });
  fs.writeFileSync(globalPath, mergeRootRouterSection(globalPath, globalTemplate), 'utf8');

  const projectPath = path.join(cwd, 'AGENTS.md');
  const projectExisted = fs.existsSync(projectPath);
  const projectBody = applyTemplate(projectTemplate, {
    AGENT_ID: agentId,
    STORE_PATH: storePath,
    REPO_PATH: repoPath,
    ACTIVE_SPEC: activeSpec,
  });
  fs.writeFileSync(projectPath, mergeRootRouterSection(projectPath, projectBody), 'utf8');

  return {
    globalPath,
    projectPath,
    globalCreated: !globalExisted,
    projectCreated: !projectExisted,
  };
}
