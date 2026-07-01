# RootRouter dashboard

Next.js app for live Celo telemetry, topology snapshots, and the public agent playbook at `/SKILL.md`.

**Production:** VPS at [rootrouter.motusdao.org](https://rootrouter.motusdao.org) — see [`deploy/README.md`](../../deploy/README.md).  
**Not on npm** — ships via Docker only; SDK (`rootrouter`) is separate.

---

## Local dev

```bash
npm install
npm run dashboard          # http://localhost:3000
npm run dashboard:build    # production build
```

Optional Convex: `NEXT_PUBLIC_CONVEX_URL` in `apps/dashboard/.env.local`.

---

## VPS deploy (default)

```bash
# From dev machine
export NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud  # optional
npm run dashboard:deploy

# On VPS
bash ~/RootRouter/scripts/deploy-dashboard-vps.sh --local
```

Then install Caddy site: `deploy/caddy/rootrouter.caddy` → reload Caddy.

Verify:

```bash
curl -sI https://rootrouter.motusdao.org/SKILL.md
curl -sI https://rootrouter.motusdao.org/
```

---

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing + links |
| `/SKILL.md` | Public agent playbook |
| `/dashboard` | Celo telemetry by agent address |
| `/dashboard/topology` | Convex-backed graph snapshots |
| `/api/snapshots` | POST for SDK demos / `rootrouter snapshot` |

---

## Vercel (optional)

Only if the GitHub repo is **public** or you have Vercel Pro (private repos). Root Directory: `apps/dashboard`. See [`vercel.json`](./vercel.json).

---

## SDK boundary

| Question | Answer |
|----------|--------|
| On npm? | **No** — `"private": true` workspace package |
| SDK imports dashboard? | **No** — optional `DASHBOARD_URL` HTTP only |
