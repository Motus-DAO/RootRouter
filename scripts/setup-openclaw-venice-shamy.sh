#!/usr/bin/env bash
# Configure OpenClaw on VPS:
#   - Shared VENICE_API_KEY in ~/.openclaw/.env
#   - avril (main/default agent): Venice direct
#   - shamy: RootRouter proxy → Venice
#
# Usage (on VPS):
#   bash ~/RootRouter/scripts/setup-openclaw-venice-shamy.sh
#   VENICE_API_KEY=vapi_... bash ~/RootRouter/scripts/setup-openclaw-venice-shamy.sh

set -euo pipefail

OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
OPENCLAW_ENV="$OPENCLAW_DIR/.env"
OPENCLAW_JSON="$OPENCLAW_DIR/openclaw.json"
PROXY_HOST="${ROOTROUTER_PROXY_HOST:-host.docker.internal}"
PROXY_PORT="${ROOTROUTER_PROXY_PORT:-8787}"
VENICE_MODEL="${VENICE_MODEL:-mistral-31-24b}"
OPENCLAW_APP="${OPENCLAW_APP:-$HOME/apps/openclaw}"

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

mkdir -p "$OPENCLAW_DIR"
chmod 700 "$OPENCLAW_DIR"

# --- Venice API key ---
if [[ -f "$OPENCLAW_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$OPENCLAW_ENV" && set +a
fi

if [[ -z "${VENICE_API_KEY:-}" ]]; then
  if [[ -t 0 ]]; then
    read -rsp "Paste Venice API key (vapi_...): " VENICE_API_KEY
    echo
  else
    die "VENICE_API_KEY missing. Add to $OPENCLAW_ENV or pass on command line."
  fi
fi

[[ "$VENICE_API_KEY" == vapi_* ]] || log "Warning: key does not start with vapi_ (may still be valid)"

if ! grep -q '^VENICE_API_KEY=' "$OPENCLAW_ENV" 2>/dev/null; then
  printf 'VENICE_API_KEY=%s\n' "$VENICE_API_KEY" >>"$OPENCLAW_ENV"
else
  # Update in place without printing key
  sed -i.bak "s|^VENICE_API_KEY=.*|VENICE_API_KEY=$VENICE_API_KEY|" "$OPENCLAW_ENV"
  rm -f "$OPENCLAW_ENV.bak"
fi
chmod 600 "$OPENCLAW_ENV"

# --- RootRouter proxy health (host) ---
if curl -sf "http://127.0.0.1:${PROXY_PORT}/healthz" >/dev/null 2>&1; then
  log "RootRouter proxy OK on 127.0.0.1:${PROXY_PORT}"
else
  log "RootRouter proxy not responding on 127.0.0.1:${PROXY_PORT} — start it after this script"
fi

# --- Merge openclaw.json ---
node <<'NODE' "$OPENCLAW_JSON" "$PROXY_HOST" "$PROXY_PORT" "$VENICE_MODEL"
const fs = require('fs');
const path = process.argv[2];
const proxyHost = process.argv[3];
const proxyPort = process.argv[4];
const modelId = process.argv[5];

const modelDef = {
  id: modelId,
  reasoning: false,
  input: ['text'],
  contextWindow: 128000,
  maxTokens: 8192,
};

let cfg = {};
if (fs.existsSync(path)) {
  try {
    cfg = JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {
    console.error('Could not parse existing config; starting fresh');
  }
}

cfg.models = cfg.models || {};
cfg.models.mode = cfg.models.mode || 'merge';
cfg.models.providers = cfg.models.providers || {};

// Venice direct (avril / standby)
cfg.models.providers.venice = {
  baseUrl: 'https://api.venice.ai/api/v1',
  apiKey: '${VENICE_API_KEY}',
  api: 'openai-completions',
  models: [{ ...modelDef, name: 'Venice direct' }],
};

// RootRouter → Venice (shamy only)
cfg.models.providers.rootrouter = {
  baseUrl: `http://${proxyHost}:${proxyPort}/api/v1`,
  apiKey: '${VENICE_API_KEY}',
  api: 'openai-completions',
  models: [{ ...modelDef, name: 'Venice via RootRouter' }],
};

cfg.agents = cfg.agents || {};
cfg.agents.defaults = cfg.agents.defaults || {};
cfg.agents.defaults.models = cfg.agents.defaults.models || {};
cfg.agents.defaults.models[`venice/${modelId}`] = { alias: 'Venice' };
cfg.agents.defaults.models[`rootrouter/${modelId}`] = { alias: 'RootRouter' };

const list = Array.isArray(cfg.agents.list) ? cfg.agents.list : [];
const byId = (id) => list.find((a) => a && a.id === id);

// Main / avril — Venice direct (standby, key ready if called)
let main = byId('main');
if (!main) {
  main = { id: 'main', default: true, name: 'Avril', workspace: '~/.openclaw/workspace' };
  list.unshift(main);
}
main.default = true;
main.name = main.name || 'Avril';
main.model = { primary: `venice/${modelId}` };

// Shamy — RootRouter
let shamy = byId('shamy');
if (!shamy) {
  shamy = {
    id: 'shamy',
    name: 'Shamy',
    workspace: '~/.openclaw/workspace-shamy',
    agentDir: '~/.openclaw/agents/shamy/agent',
  };
  list.push(shamy);
}
shamy.name = 'Shamy';
shamy.model = { primary: `rootrouter/${modelId}` };

cfg.agents.list = list;

fs.writeFileSync(path, JSON.stringify(cfg, null, 2) + '\n');
console.log('Wrote', path);
console.log('  avril/main -> venice/' + modelId);
console.log('  shamy      -> rootrouter/' + modelId + ' @', `http://${proxyHost}:${proxyPort}/api/v1`);
NODE

log "Config written to $OPENCLAW_JSON"

# --- Ensure docker stack .env passes VENICE_API_KEY into gateway ---
if [[ -d "$OPENCLAW_APP" && -f "$OPENCLAW_APP/docker-compose.yml" ]]; then
  APP_ENV="$OPENCLAW_APP/.env"
  touch "$APP_ENV"
  if ! grep -q '^VENICE_API_KEY=' "$APP_ENV" 2>/dev/null; then
    printf 'VENICE_API_KEY=%s\n' "$VENICE_API_KEY" >>"$APP_ENV"
    log "Added VENICE_API_KEY to $APP_ENV"
  fi
  if ! grep -q '^OPENCLAW_CONFIG_DIR=' "$APP_ENV" 2>/dev/null; then
    printf 'OPENCLAW_CONFIG_DIR=%s\n' "$OPENCLAW_DIR" >>"$APP_ENV"
    log "Set OPENCLAW_CONFIG_DIR=$OPENCLAW_DIR in $APP_ENV"
  fi

  log "Restarting OpenClaw gateway (avril)..."
  (cd "$OPENCLAW_APP" && docker compose up -d openclaw-gateway 2>/dev/null) \
    || (cd "$OPENCLAW_APP" && docker compose restart openclaw-gateway 2>/dev/null) \
    || log "Could not restart docker — run manually: cd $OPENCLAW_APP && docker compose restart"
fi

# --- Shamy stack if present ---
SHAMY_APP="${SHAMY_APP:-$HOME/apps/shamy}"
if [[ -d "$SHAMY_APP" && -f "$SHAMY_APP/docker-compose.yml" ]]; then
  SHAMY_ENV="$SHAMY_APP/.env"
  touch "$SHAMY_ENV"
  grep -q '^VENICE_API_KEY=' "$SHAMY_ENV" 2>/dev/null || printf 'VENICE_API_KEY=%s\n' "$VENICE_API_KEY" >>"$SHAMY_ENV"
  grep -q '^OPENCLAW_CONFIG_DIR=' "$SHAMY_ENV" 2>/dev/null || printf 'OPENCLAW_CONFIG_DIR=%s\n' "$OPENCLAW_DIR" >>"$SHAMY_ENV"
  log "Restarting shamy stack..."
  (cd "$SHAMY_APP" && docker compose up -d 2>/dev/null) || log "Shamy compose restart skipped (check $SHAMY_APP)"
fi

log "Done."
log "  avril (main): venice/$VENICE_MODEL — direct, standby"
log "  shamy:        rootrouter/$VENICE_MODEL — via :${PROXY_PORT}"
log "Verify: curl -s http://127.0.0.1:${PROXY_PORT}/healthz"

# --- Layer 0 + Layer 1 onboarding in Shamy workspace ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SHAMY_WORKSPACE="${SHAMY_WORKSPACE:-$HOME/data/shamy/workspace}"
FENG_SHUI_SRC="$REPO_ROOT/docs/skills/feng-shui"
ORGANIZE_SRC="$REPO_ROOT/docs/skills/organize-space"
PUBLIC_URL="${ROOTROUTER_PUBLIC_URL:-https://rootrouter.motusdao.org}"
PLAYBOOK_URL="$PUBLIC_URL/SKILL.md"
FENG_SHUI_URL="$PUBLIC_URL/FENG-SHUI.md"

install_shamy_workspace_tools() {
  local tools_dir="$SHAMY_WORKSPACE/tools/feng-shui"
  mkdir -p "$SHAMY_WORKSPACE" "$tools_dir"
  if [[ -f "$FENG_SHUI_SRC/scripts/workspace_guard.py" ]]; then
    cp "$FENG_SHUI_SRC/scripts/workspace_guard.py" "$tools_dir/workspace_guard.py"
    chmod +x "$tools_dir/workspace_guard.py"
    log "Installed workspace_guard.py → $tools_dir/"
  else
    log "Warning: $FENG_SHUI_SRC/scripts/workspace_guard.py not found — skip copy"
  fi
  if [[ -f "$ORGANIZE_SRC/scripts/inventory.py" ]]; then
    cp "$ORGANIZE_SRC/scripts/inventory.py" "$tools_dir/inventory.py"
    chmod +x "$tools_dir/inventory.py"
    log "Installed inventory.py → $tools_dir/"
  fi
}

merge_shamy_agents_md() {
  local agents_file="$SHAMY_WORKSPACE/AGENTS.md"
  local tmp_snippet="/tmp/shamy-onboarding-snippet.md"
  cat >"$tmp_snippet" <<EOF

## Workspace (Layer 0)

Before creating or moving files, read
$FENG_SHUI_URL
and follow it. Run \`python3 tools/feng-shui/workspace_guard.py --path "\$PWD" --intent write\` before the first write of each task (when cwd changes). Never create projects at the home root, Desktop, or Downloads.

## RootRouter (Layer 1)

Before discussing RootRouter, agent context routing, token strategy, or Motus agent infrastructure, read
$PLAYBOOK_URL
and follow it.

RootRouter is **not** a network router. This agent uses \`rootrouter/*\` models — the proxy trims chat history only. Fetch the playbook for repo work and correct mental models.
EOF

  if [[ ! -f "$agents_file" ]]; then
    {
      cat "$tmp_snippet"
      printf '\n'
    } >"$agents_file"
    log "Created $agents_file with Layer 0 + Layer 1 onboarding"
    return
  fi

  local changed=0
  if ! grep -q "$FENG_SHUI_URL" "$agents_file" 2>/dev/null; then
    cp "$agents_file" "$agents_file.bak-feng-shui"
    cat "$tmp_snippet" "$agents_file" > /tmp/AGENTS.merged && mv /tmp/AGENTS.merged "$agents_file"
    log "Prepended Feng Shui (Layer 0) to $agents_file"
    changed=1
  fi
  if ! grep -q "$PLAYBOOK_URL" "$agents_file" 2>/dev/null; then
    [[ "$changed" -eq 0 ]] && cp "$agents_file" "$agents_file.bak-playbook"
    cat > /tmp/rootrouter-playbook-snippet.md << EOF

## RootRouter (Layer 1)

Before discussing RootRouter, agent context routing, token strategy, or Motus agent infrastructure, read
$PLAYBOOK_URL
and follow it.

RootRouter is **not** a network router. This agent uses \`rootrouter/*\` models — the proxy trims chat history only. Fetch the playbook for repo work and correct mental models.
EOF
    cat /tmp/rootrouter-playbook-snippet.md "$agents_file" > /tmp/AGENTS.merged && mv /tmp/AGENTS.merged "$agents_file"
    log "Prepended RootRouter (Layer 1) to $agents_file"
  fi
}

merge_shamy_bootstrap_md() {
  local bootstrap_file="$SHAMY_WORKSPACE/BOOTSTRAP.md"
  if [[ -f "$bootstrap_file" ]] && grep -q "$FENG_SHUI_URL" "$bootstrap_file" 2>/dev/null; then
    return
  fi
  if [[ -f "$FENG_SHUI_SRC/assets/openclaw/BOOTSTRAP.fragment.md" ]]; then
    if [[ -f "$bootstrap_file" ]]; then
      cp "$bootstrap_file" "$bootstrap_file.bak-feng-shui"
      cat "$FENG_SHUI_SRC/assets/openclaw/BOOTSTRAP.fragment.md" "$bootstrap_file" > /tmp/BOOTSTRAP.merged
      mv /tmp/BOOTSTRAP.merged "$bootstrap_file"
    else
      cp "$FENG_SHUI_SRC/assets/openclaw/BOOTSTRAP.fragment.md" "$bootstrap_file"
    fi
    log "Merged Feng Shui bootstrap into $bootstrap_file"
  fi
}

install_shamy_workspace_tools
merge_shamy_agents_md
merge_shamy_bootstrap_md
log "Onboarding URLs: $FENG_SHUI_URL (Layer 0) · $PLAYBOOK_URL (Layer 1)"
