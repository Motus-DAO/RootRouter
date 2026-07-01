# RootRouter dashboard

Next.js app for live Celo telemetry, topology snapshots, and the public agent playbook at `/SKILL.md`.

**This app is not published to npm.** It lives in git for Vercel deployment only. The SDK (`rootrouter`) ships separately from `packages/sdk/`.

---

## Local dev

From the monorepo root:

```bash
npm install
npm run dashboard          # http://localhost:3000
npm run dashboard:build    # production build
```

Optional Convex: add `NEXT_PUBLIC_CONVEX_URL` to `apps/dashboard/.env.local`.

Push snapshots from demos or CLI:

```bash
export DASHBOARD_URL=http://localhost:3000
export ROOTROUTER_STORE_PATH=~/.rootrouter/store.json
npx rootrouter snapshot
```

---

## Vercel setup (step by step)

Connect the **RootRouter/RootRouter** GitHub repo to a Vercel project, then:

### 1. Root Directory (required)

**Settings → General → Root Directory** → `apps/dashboard`

Without this, Vercel builds from the repo root, runs the wrong command, and fails with:

> The Next.js output directory ".next" was not found at "/vercel/path0/.next"

### 2. Build settings (usually auto from `vercel.json`)

This folder’s [`vercel.json`](./vercel.json) tells Vercel to install and build from the monorepo root (workspace hoisting + `next.config.mjs` `turbopack.root`):

| Setting | Value |
|---------|--------|
| Framework Preset | Next.js |
| Root Directory | `apps/dashboard` |
| Install Command | `cd ../.. && npm install` |
| Build Command | `cd ../.. && npm run dashboard:build` |
| Output Directory | *(leave default — `.next` inside this app)* |

Do **not** set Output Directory to a path at the repo root.

### 3. Environment variables

**Settings → Environment Variables**

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Recommended | Convex backend for topology snapshots |

### 4. Branch

Deploy `release/0.2.0-beta.0` or `main` — whichever branch you ship from.

### 5. Verify after deploy

```bash
curl -sI https://root-router.vercel.app/SKILL.md
curl -sI https://root-router.vercel.app/
```

---

## How this stays separate from the SDK

| Question | Answer |
|----------|--------|
| Can dashboard code end up on npm? | **No** — `@rootrouter/dashboard` has `"private": true`; `npm run publish:packages` only publishes `packages/sdk`, `packages/proxy`, `packages/mcp`. |
| Does the SDK import the dashboard? | **No** — SDK only optionally `fetch()`es `DASHBOARD_URL/api/snapshots`. |
| Should dashboard be in git? | **Yes** — Vercel deploys from GitHub; source must be committed. |
| Is `.next/` committed? | **No** — listed in root `.gitignore`. |

---

## Routes

| Path | Purpose |
|------|---------|
| `/` | Landing + links |
| `/SKILL.md` | Public agent playbook (static file in `public/`) |
| `/dashboard` | Celo telemetry by agent address |
| `/dashboard/topology` | Convex-backed graph snapshots |
| `/api/snapshots` | POST endpoint for SDK demos / `rootrouter snapshot` |
