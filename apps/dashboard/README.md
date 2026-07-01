# RootRouter dashboard

Next.js app for live Celo telemetry, topology snapshots, and the public agent playbook at `/SKILL.md`.

## Local dev

From the monorepo root:

```bash
npm install
npm run dashboard
```

Optional Convex: copy `.env.example` values into `apps/dashboard/.env.local` (`NEXT_PUBLIC_CONVEX_URL`).

## Vercel

**Root Directory must be `apps/dashboard`** (Project → Settings → General → Root Directory).

This folder’s `vercel.json` installs and builds from the monorepo root so workspace hoisting and `next.config.mjs` `turbopack.root` resolve correctly. Do not set a custom Output Directory — Next.js output stays at `.next` inside this app.

Required env (Vercel project settings):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex backend for topology snapshots (optional but recommended) |

After deploy, verify:

```bash
curl -sI https://root-router.vercel.app/SKILL.md
```
