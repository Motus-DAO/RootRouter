#!/usr/bin/env bash
# Build and run RootRouter dashboard on VPS (Docker + Caddy).
#
# Local (from dev machine — rsync + remote build):
#   ROOTROUTER_VPS=gerry@109.199.99.188 bash scripts/deploy-dashboard-vps.sh
#
# On VPS directly:
#   bash ~/RootRouter/scripts/deploy-dashboard-vps.sh --local
#
# Env:
#   ROOTROUTER_VPS          SSH target (default: gerry@109.199.99.188)
#   ROOTROUTER_PUBLIC_URL   https://rootrouter.motusdao.org
#   NEXT_PUBLIC_CONVEX_URL  Convex URL (baked into image at build)
#   ROOTROUTER_DOCKER_NETWORK  default openclaw_default

set -euo pipefail

ROOTROUTER_VPS="${ROOTROUTER_VPS:-gerry@109.199.99.188}"
ROOTROUTER_PUBLIC_URL="${ROOTROUTER_PUBLIC_URL:-https://rootrouter.motusdao.org}"
REPO_DIR="${REPO_DIR:-$HOME/RootRouter}"
LOCAL=false

for arg in "$@"; do
  case "$arg" in
    --local) LOCAL=true ;;
  esac
done

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

remote_build() {
  local host="$1"
  ssh "$host" bash -s <<REMOTE
set -euo pipefail
cd "$REPO_DIR"
export NEXT_PUBLIC_CONVEX_URL="${NEXT_PUBLIC_CONVEX_URL:-}"
export ROOTROUTER_DOCKER_NETWORK="${ROOTROUTER_DOCKER_NETWORK:-openclaw_default}"

if ! docker network inspect "\$ROOTROUTER_DOCKER_NETWORK" >/dev/null 2>&1; then
  echo "Docker network \$ROOTROUTER_DOCKER_NETWORK missing — create or set ROOTROUTER_DOCKER_NETWORK"
  exit 1
fi

docker compose -f docker-compose.dashboard.yml build --no-cache
docker compose -f docker-compose.dashboard.yml up -d

echo ""
echo "Dashboard container: rootrouter-dashboard:3000"
echo "Public URL (after Caddy): $ROOTROUTER_PUBLIC_URL"
echo "SKILL.md: $ROOTROUTER_PUBLIC_URL/SKILL.md"
REMOTE
}

local_build() {
  cd "$REPO_DIR"
  export NEXT_PUBLIC_CONVEX_URL="${NEXT_PUBLIC_CONVEX_URL:-}"
  export ROOTROUTER_DOCKER_NETWORK="${ROOTROUTER_DOCKER_NETWORK:-openclaw_default}"

  if ! docker network inspect "$ROOTROUTER_DOCKER_NETWORK" >/dev/null 2>&1; then
    die "Docker network $ROOTROUTER_DOCKER_NETWORK missing. Create it or join OpenClaw stack first."
  fi

  docker compose -f docker-compose.dashboard.yml build
  docker compose -f docker-compose.dashboard.yml up -d
}

install_caddy_hint() {
  log "Caddy: copy deploy/caddy/rootrouter.caddy to your Caddy sites dir, then reload."
  log "  sudo cp $REPO_DIR/deploy/caddy/rootrouter.caddy /etc/caddy/sites/"
  log "  sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy"
}

verify() {
  local url="$ROOTROUTER_PUBLIC_URL"
  log "Verify (after DNS + Caddy):"
  printf '  curl -sI %s/SKILL.md\n' "$url"
  printf '  curl -sI %s/\n' "$url"
}

if $LOCAL; then
  log "Building dashboard on this machine..."
  local_build
else
  log "Rsync monorepo to $ROOTROUTER_VPS:$REPO_DIR ..."
  rsync -az --delete \
    --exclude node_modules \
    --exclude .next \
    --exclude .git \
    --exclude packages/sdk/dist \
    --exclude packages/sdk/logs \
    --exclude .rootrouter \
    ./ "${ROOTROUTER_VPS}:${REPO_DIR}/"

  log "Remote Docker build + start..."
  remote_build "$ROOTROUTER_VPS"
fi

install_caddy_hint
verify
log "Done."
