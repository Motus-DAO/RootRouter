import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ROOTROUTER_AGENT_ID_HEADER,
  defaultPersonaProxyStorePath,
  scopedProxyAgentId,
  type ProxyPersona,
} from './runtimeStores';

const HERMES_PERSONA: ProxyPersona = 'hermes-coo';
const DEFAULT_PROXY_BASE = 'http://127.0.0.1:8787/api/v1';

export interface InitHermesOptions {
  /** Override ~/.hermes path */
  hermesHome?: string;
  /** Proxy OpenAI-compatible base URL */
  proxyBaseUrl?: string;
  /** Project slug for x-rootrouter-agent-id (default: Hermes active project) */
  projectSlug?: string;
  /** If true, set model.provider to rootrouter (default true) */
  setDefaultProvider?: boolean;
  /** Dry-run: return planned patch without writing */
  dryRun?: boolean;
}

export interface InitHermesResult {
  target: string;
  created: boolean;
  message: string;
  storePath: string;
  agentId: string;
  projectSlug: string;
  proxyBaseUrl: string;
}

function hermesHome(options?: InitHermesOptions): string {
  return options?.hermesHome?.trim() || path.join(os.homedir(), '.hermes');
}

/** Read active Hermes project slug from projects.db (sqlite3 CLI). */
export function readHermesActiveProjectSlug(hermesDir: string): string | null {
  const dbPath = path.join(hermesDir, 'projects.db');
  if (!fs.existsSync(dbPath)) return null;
  try {
    const activeId = execFileSync(
      'sqlite3',
      [dbPath, "SELECT value FROM project_meta WHERE key='active_id' LIMIT 1;"],
      { encoding: 'utf8' }
    ).trim();
    if (!activeId) return null;
    const slug = execFileSync(
      'sqlite3',
      [dbPath, `SELECT slug FROM projects WHERE id='${activeId.replace(/'/g, "''")}' LIMIT 1;`],
      { encoding: 'utf8' }
    ).trim();
    return slug || null;
  } catch {
    return null;
  }
}

function indentOf(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

/**
 * Patch ~/.hermes/config.yaml:
 * - model → rootrouter proxy (optional)
 * - providers.rootrouter base_url + extra_headers agentId
 * Removes unknown `enabled:` under rootrouter (Hermes warns on it).
 */
export function patchHermesConfigYaml(
  yaml: string,
  opts: { proxyBaseUrl: string; agentId: string; setDefaultProvider: boolean }
): string {
  const lines = yaml.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  let inModel = false;
  let modelIndent = 0;
  let inProviders = false;
  let providersIndent = 0;
  let inRootrouter = false;
  let rootrouterIndent = 0;
  let sawExtraHeaders = false;
  let wroteAgentHeader = false;

  const flushRootrouterExtras = (baseIndent: number) => {
    if (wroteAgentHeader) return;
    const pad = ' '.repeat(baseIndent + 2);
    const pad2 = ' '.repeat(baseIndent + 4);
    out.push(`${pad}extra_headers:`);
    out.push(`${pad2}${ROOTROUTER_AGENT_ID_HEADER}: "${opts.agentId}"`);
    wroteAgentHeader = true;
    sawExtraHeaders = true;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const ind = indentOf(line);

    // Top-level model:
    if (/^model:\s*$/.test(trimmed) && ind === 0) {
      inModel = true;
      modelIndent = 0;
      inProviders = false;
      inRootrouter = false;
      out.push(line);
      i++;
      continue;
    }

    if (inModel && ind <= modelIndent && trimmed !== '' && !trimmed.startsWith('#') && !/^model:/.test(trimmed)) {
      inModel = false;
    }

    if (inModel && opts.setDefaultProvider) {
      if (/^provider:\s*/.test(trimmed) && ind === 2) {
        out.push(`${' '.repeat(ind)}provider: rootrouter`);
        i++;
        continue;
      }
      if (/^base_url:\s*/.test(trimmed) && ind === 2) {
        out.push(`${' '.repeat(ind)}base_url: ${opts.proxyBaseUrl}`);
        i++;
        continue;
      }
      if (/^key_env:\s*/.test(trimmed) && ind === 2) {
        out.push(`${' '.repeat(ind)}key_env: VENICE_API_KEY`);
        i++;
        continue;
      }
    }

    // providers:
    if (/^providers:\s*$/.test(trimmed) && ind === 0) {
      inProviders = true;
      providersIndent = 0;
      inModel = false;
      inRootrouter = false;
      out.push(line);
      i++;
      continue;
    }

    if (inProviders && ind <= providersIndent && trimmed !== '' && !trimmed.startsWith('#') && !/^providers:/.test(trimmed)) {
      if (inRootrouter) {
        flushRootrouterExtras(rootrouterIndent);
        inRootrouter = false;
      }
      inProviders = false;
    }

    if (inProviders && /^rootrouter:\s*$/.test(trimmed) && ind === 2) {
      inRootrouter = true;
      rootrouterIndent = ind;
      sawExtraHeaders = false;
      wroteAgentHeader = false;
      out.push(line);
      i++;
      continue;
    }

    if (inRootrouter) {
      // Next sibling provider or leaving providers
      if (ind <= rootrouterIndent && trimmed !== '' && !trimmed.startsWith('#') && !/^rootrouter:/.test(trimmed)) {
        flushRootrouterExtras(rootrouterIndent);
        inRootrouter = false;
        // fall through to reprocess this line
        continue;
      }

      if (/^enabled:\s*/.test(trimmed) && ind === rootrouterIndent + 2) {
        i++;
        continue; // drop unknown key
      }

      if (/^base_url:\s*/.test(trimmed) && ind === rootrouterIndent + 2) {
        out.push(`${' '.repeat(ind)}base_url: ${opts.proxyBaseUrl}`);
        i++;
        continue;
      }
      if (/^api:\s*/.test(trimmed) && ind === rootrouterIndent + 2) {
        out.push(`${' '.repeat(ind)}api: ${opts.proxyBaseUrl}`);
        i++;
        continue;
      }

      if (/^extra_headers:\s*$/.test(trimmed) && ind === rootrouterIndent + 2) {
        sawExtraHeaders = true;
        out.push(line);
        i++;
        // consume existing nested headers; rewrite agent id
        let replaced = false;
        while (i < lines.length) {
          const h = lines[i];
          const ht = h.trim();
          const hi = indentOf(h);
          if (ht === '' || ht.startsWith('#')) {
            out.push(h);
            i++;
            continue;
          }
          if (hi <= rootrouterIndent + 2) break;
          if (ht.startsWith(`${ROOTROUTER_AGENT_ID_HEADER}:`)) {
            out.push(`${' '.repeat(hi)}${ROOTROUTER_AGENT_ID_HEADER}: "${opts.agentId}"`);
            replaced = true;
            wroteAgentHeader = true;
            i++;
            continue;
          }
          out.push(h);
          i++;
        }
        if (!replaced) {
          out.push(
            `${' '.repeat(rootrouterIndent + 4)}${ROOTROUTER_AGENT_ID_HEADER}: "${opts.agentId}"`
          );
          wroteAgentHeader = true;
        }
        continue;
      }

      out.push(line);
      i++;
      continue;
    }

    out.push(line);
    i++;
  }

  if (inRootrouter) {
    flushRootrouterExtras(rootrouterIndent);
  }

  // If rootrouter provider block missing entirely, append a minimal one
  if (!/^\s*rootrouter:\s*$/m.test(yaml) && !out.some((l) => /^\s*rootrouter:\s*$/.test(l))) {
    const block = [
      '  rootrouter:',
      '    name: RootRouter Proxy',
      `    base_url: ${opts.proxyBaseUrl}`,
      `    api: ${opts.proxyBaseUrl}`,
      '    key_env: VENICE_API_KEY',
      '    default_model: deepseek-v4-flash',
      '    discover_models: false',
      '    extra_headers:',
      `      ${ROOTROUTER_AGENT_ID_HEADER}: "${opts.agentId}"`,
      '    context_length: 128000',
      '',
    ];
    const providersIdx = out.findIndex((l) => /^providers:\s*$/.test(l.trim()) && indentOf(l) === 0);
    if (providersIdx >= 0) {
      out.splice(providersIdx + 1, 0, ...block);
    } else {
      out.push('providers:', ...block);
    }
  } else if (!sawExtraHeaders && !wroteAgentHeader) {
    // rootrouter existed but we never hit end — already handled by flush
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function initHermes(options?: InitHermesOptions): InitHermesResult {
  const home = hermesHome(options);
  const configPath = path.join(home, 'config.yaml');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Hermes config not found: ${configPath}`);
  }

  const projectSlug =
    options?.projectSlug?.trim() ||
    readHermesActiveProjectSlug(home) ||
    'default';

  const agentId = scopedProxyAgentId(HERMES_PERSONA, projectSlug === 'default' ? null : projectSlug);
  const storePath = defaultPersonaProxyStorePath(HERMES_PERSONA);
  const proxyBaseUrl = options?.proxyBaseUrl?.trim() || DEFAULT_PROXY_BASE;
  const setDefaultProvider = options?.setDefaultProvider !== false;

  fs.mkdirSync(path.dirname(storePath), { recursive: true });

  const before = fs.readFileSync(configPath, 'utf8');
  const after = patchHermesConfigYaml(before, {
    proxyBaseUrl,
    agentId,
    setDefaultProvider,
  });

  if (!options?.dryRun) {
    fs.writeFileSync(configPath, after.endsWith('\n') ? after : after + '\n', 'utf8');
  }

  return {
    target: configPath,
    created: false,
    storePath,
    agentId,
    projectSlug,
    proxyBaseUrl,
    message:
      `${options?.dryRun ? 'Would update' : 'Updated'} Hermes → RootRouter proxy ` +
      `(provider=${setDefaultProvider ? 'rootrouter' : 'unchanged'}, agentId=${agentId})`,
  };
}
