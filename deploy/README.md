# VPS deployment (dashboard + proxy)

Self-host on your VPS when the GitHub repo is private (Vercel Hobby cannot deploy private repos).

**Public URL (Motus):** `https://rootrouter.motusdao.org`  
**Agent playbook:** `https://rootrouter.motusdao.org/SKILL.md`

---

## Prerequisites

| Item | Notes |
|------|--------|
| Docker | Same host as OpenClaw / Caddy |
| Network `openclaw_default` | Dashboard joins it so Caddy can `reverse_proxy rootrouter-dashboard:3000` |
| DNS | `rootrouter.motusdao.org` → VPS IP |
| Convex (optional) | `NEXT_PUBLIC_CONVEX_URL` for topology snapshots |

---

## 1. Dashboard (Docker)

From your **dev machine** (rsync + remote build):

```bash
export NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud   # optional
export ROOTROUTER_VPS=gerry@YOUR_VPS_IP
bash scripts/deploy-dashboard-vps.sh
```

On the **VPS** directly:

```bash
cd ~/RootRouter
git pull   # or rsync from dev machine
export NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud   # optional
bash scripts/deploy-dashboard-vps.sh --local
```

Manual equivalent:

```bash
cd ~/RootRouter
docker compose -f docker-compose.dashboard.yml build
docker compose -f docker-compose.dashboard.yml up -d
```

Container: `rootrouter-dashboard` on port 3000 (internal Docker network only).

---

## 2. Caddy (HTTPS)

```bash
sudo cp deploy/caddy/rootrouter.caddy /etc/caddy/sites/
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Snippet routes `rootrouter.motusdao.org` → `rootrouter-dashboard:3000`.

---

## 3. Verify

```bash
curl -sI https://rootrouter.motusdao.org/SKILL.md
curl -sI https://rootrouter.motusdao.org/
docker logs rootrouter-dashboard --tail 30
```

---

## 4. SDK snapshots → dashboard

```bash
export DASHBOARD_URL=https://rootrouter.motusdao.org
npx rootrouter snapshot
```

---

## Files

| File | Purpose |
|------|---------|
| `apps/dashboard/Dockerfile` | Multi-stage Next.js standalone image |
| `docker-compose.dashboard.yml` | Service on `openclaw_default` |
| `deploy/caddy/rootrouter.caddy` | HTTPS reverse proxy |
| `scripts/deploy-dashboard-vps.sh` | Rsync + build helper |

---

## Proxy sidecar (agents)

OpenClaw agents use `rootrouter-proxy` on the same Docker network — see [`docs/insights/007-openclaw-vps-agent-ux-lessons.md`](../docs/insights/007-openclaw-vps-agent-ux-lessons.md).
