# Insight 007 — OpenClaw VPS deployment: agent UX lessons & outside-the-box RootRouter

**Captured:** 2026-07-01  
**Source:** Live Shamy deployment on Contabo VPS (OpenClaw + Venice + RootRouter proxy)  
**Status:** Product insight — drives proxy hardening, deploy templates, and agent UX  
**Related:** [deployment-matrix](../deployment-matrix.md) · [venice provider](../providers/venice.md) · [proxy README](../../packages/proxy/README.md)

---

## Summary

We deployed RootRouter on a **real** production path: OpenClaw in Docker, Venice inference keys, Caddy reverse proxy, two agents (Shamy + Avril). Every failure looked like an **agent problem** to the user (“stuck in progress”, “could not connect”, “agent failed before reply”) but the root causes were **infrastructure and transport** — not selection quality.

**Takeaway:** RootRouter’s value is proven only when the **full path** works. Agent UX and “outside the box” deployment are the same problem: reduce surprise between “I pointed base_url” and “the agent actually replies.”

---

## What we shipped (target architecture)

```
Browser → Caddy (shamy.motusdao.org)
       → OpenClaw gateway (Docker, agent: shamy)
       → RootRouter proxy (Docker, openclaw_default network)
       → Venice API (inference key in container env)
```

| Agent | Model route | Purpose |
|-------|-------------|---------|
| **Shamy** | `rootrouter/kimi-k2-5` → `http://rootrouter-proxy:8797/api/v1` | Test token savings + routing |
| **Avril** | `venice/kimi-k2-5` direct | Standby; same key, no proxy |

---

## Failure modes → what the user saw → real cause

| # | User-visible symptom | Actual cause | Layer |
|---|----------------------|--------------|--------|
| 1 | `npx @rootrouter/proxy` 404 | Package not published to npm yet | Distribution |
| 2 | Dashboard “Could not connect” / WebSocket error | Gateway crash-loop: `VENICE_API_KEY` in `.env` but **not in docker-compose `environment`** | Agent host config |
| 3 | `https://shamy.motusdao.org` 502 | Shamy gateway recreated on `shamy_default`; **Caddy on `openclaw_default`** — networks split | Docker / ops |
| 4 | Agent “in progress”, typing, no reply (~2 min) | OpenClaw → `172.17.0.1:8797` **ETIMEDOUT** (host proxy unreachable from container) | Docker networking |
| 5 | 402 / “billing error” | Wrong or depleted inference key on VPS (account had $0.15; key on server differed) | Provider auth |
| 6 | “LLM request timed out” (~5 s) after key fixed | **Streaming gzip bug** in proxy: fetch decompresses body but forwarded `content-encoding: gzip` | RootRouter proxy |
| 7 | Generic “Agent failed before reply” | OpenClaw surfaces `FailoverError` / `terminated` — **no hint** it was transport vs billing vs model | Agent UX |

The user blamed the agent. The stack blamed nothing useful.

---

## Agent UX lessons (for OpenClaw and any HTTP agent host)

### 1. Fail fast with the right error class

| Bad | Better |
|-----|--------|
| “In progress…” for 120s | Connect timeout at 10s with “cannot reach model endpoint” |
| “LLM request timed out” (5s) | “Stream interrupted at proxy — retry or disable streaming” |
| “billing error” on `rootrouter` provider | “Venice returned 402 — check inference key credits at venice.ai” |

**RootRouter action:** Optional response header `x-rootrouter-upstream-status` / `x-rootrouter-error-class` on proxy errors so agents can map failures.

### 2. Streaming is the default path — proxy must be stream-safe

OpenClaw (and most OpenAI-compatible clients) use `stream: true`. Our proxy “pipes through unchanged” **in intent** but Node `fetch` auto-decompresses gzip while leaving encoding headers — clients see `terminated` / timeout.

**Fixed:** `accept-encoding: identity` upstream; strip `content-encoding` on response.  
**RootRouter action:** Add streaming e2e test against real gzip upstream (Venice/OpenRouter); document in proxy README.

### 3. Secrets ≠ config: env files are not enough in Docker

`~/.openclaw/.env` and `apps/shamy/.env` are invisible to containers unless:

- `env_file:` or explicit `environment:` in compose, or
- `models.providers.*.apiKey` uses inline secret (worse)

OpenClaw now **requires** `${VENICE_API_KEY}` at gateway boot when provider references it — gateway never starts, dashboard shows connection errors.

**RootRouter action:** `setup-openclaw-venice-shamy.sh` must patch **compose**, not only `openclaw.json`. `rootrouter doctor` should warn: “VENICE_API_KEY in .env but not in container env.”

### 4. `base_url` on the host is not `base_url` in Docker

| Context | Wrong | Right |
|---------|-------|-------|
| OpenClaw on host | `http://127.0.0.1:8787` | OK |
| OpenClaw in Docker | `http://127.0.0.1:8787` | **Loopback inside container** |
| OpenClaw in Docker | `http://172.17.0.1:8787` | Often **firewalled / no route** on Linux |
| OpenClaw in Docker | `http://rootrouter-proxy:8797` | **Same Docker network** (what worked) |

**Outside the box:** RootRouter proxy as a **sidecar container**, not a host process.

### 5. Port collisions are real

Port `8787` was already `openclaw-bridge`. Blind docs saying “8787” caused EADDRINUSE and wrong mental model.

**RootRouter action:** `PORT` env + `doctor` port check; document “find a free port or use compose service name.”

### 6. Multi-agent = multi config root, not `~/.openclaw`

| Agent | Config path |
|-------|-------------|
| Shamy | `/home/gerry/data/shamy/config/openclaw.json` |
| Avril | `/home/gerry/data/openclaw/config/openclaw.json` |

Init scripts that only touch `~/.openclaw` miss production layouts.

### 7. Reverse proxy is part of the agent UX

Caddy → container name only resolves on **shared network**. Recreating compose stacks without `openclaw_default` broke HTTPS dashboard even when local health was fine.

---

## RootRouter “outside the box” patterns

These are **valid insertion points** not covered by “change base_url in your SDK app”:

### Pattern A — Proxy sidecar on agent Docker network

```yaml
# docker-compose.proxy.yml (on openclaw_default)
services:
  rootrouter-proxy:
    image: node:22-bookworm
    volumes:
      - /path/to/RootRouter:/repo:ro
      - /path/to/.rootrouter:/data
    working_dir: /repo/packages/proxy
    command: ["node", "dist/server.js"]
    environment:
      PORT: 8797
      ROOTROUTER_UPSTREAM_ORIGIN: https://api.venice.ai
      ROOTROUTER_MODEL_ROUTING: "true"
      MODEL_CATALOG: venice
    networks: [openclaw]

networks:
  openclaw:
    external: true
    name: openclaw_default
```

OpenClaw provider:

```json
"baseUrl": "http://rootrouter-proxy:8797/api/v1"
```

### Pattern B — Per-agent routing without per-agent keys

One Venice key in compose; two providers in one gateway:

- `venice/*` — direct (Avril, standby)
- `rootrouter/*` — trimmed (Shamy, experiment)

Same billing, different transport. RootRouter is **opt-in per agent** via `agents.list[].model.primary`.

### Pattern C — Source deploy when npm scope isn’t yours

Private repo + unpublished `@rootrouter/proxy` → rsync monorepo, `npm run build:all`, run `dist/server.js` or sidecar. **Not a failure** — expected for early adopters.

### Pattern D — Model routing as silent cost control

With `ROOTROUTER_MODEL_ROUTING=true`, proxy rewrote `kimi-k2-5` → `qwen3-4b` / `mistral-31-24b` by tier. Agent UI still shows requested model; upstream changes. **UX gap:** expose `x-rootrouter-model-selected` in agent logs or dashboard.

### Pattern E — MCP later; proxy first for OpenClaw

OpenClaw dashboard chat cannot call MCP for cold repo load on every turn. **Proxy-first** is the right wedge for “it just saves tokens on conversation history.” MCP adds repo indexing for coding slices later — don’t stack both on the same request.

---

## Product backlog (insight-derived)

Tracked in [`docs/NEXT.md` — Phase 5](../NEXT.md#phase-5--agent-deploy-hardening-p0--p1--next-batch).

| Priority | Item | Why |
|----------|------|-----|
| P0 | Streaming + gzip e2e tests | Prevent “agent stuck” regressions |
| P0 | Publish `@rootrouter/proxy@beta` or document source-deploy as official | First command failed |
| P1 | `docker-compose.proxy.yml` + `setup-openclaw-venice-shamy.sh` (compose + network + sidecar) | Repeatable VPS path |
| P1 | `rootrouter doctor --docker` — port, network reachability, stream smoke | Ops confidence |
| P2 | Proxy response headers for error classification | Better agent failover messages |
| P2 | Insight in init output: “If agent runs in Docker, use service DNS not 127.0.0.1” | Prevent #4 |
| P3 | Dashboard topology: show Shamy → rootrouter-proxy → Venice in deploy matrix UI | Devrel / Motus swarm story |

---

## North star (refined)

> **Agents should fail in seconds with actionable errors — and succeed with fewer tokens — without the operator learning Docker networking, gzip, and Venice key tiers.**

RootRouter wins when:

1. **Passive trim** works on the agent’s real HTTP path (including streams).
2. **Deploy** is one compose overlay, not a wiki of fixes.
3. **UX** distinguishes “can’t reach proxy”, “provider billing”, and “model slow”.

This deployment was expensive in operator time. Capturing it here turns pain into the next shipping batch.

---

## Related commands (this deployment)

```bash
# Health
curl https://shamy.motusdao.org/healthz
docker exec rootrouter-proxy wget -qO- http://127.0.0.1:8797/healthz

# Logs
docker logs shamy-openclaw-gateway-1 --tail 30
docker logs rootrouter-proxy --tail 20

# Rebuild proxy after patch
cd ~/RootRouter && npm run proxy:build && docker restart rootrouter-proxy
```
