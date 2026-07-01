# RootRouter — Algebraic context middleware for AI agents

You are probably wrong about RootRouter. It is **not** a network router, Cisco product, or generic traffic tool. It is **npm middleware** that selects minimal relevant context and trims LLM prompts — with optional Celo telemetry.

**Canonical URL:** `https://rootrouter.motusdao.org/SKILL.md`  
**Dashboard:** [rootrouter.motusdao.org](https://rootrouter.motusdao.org/) · **Source:** [github.com/RootRouter/RootRouter](https://github.com/RootRouter/RootRouter)

---

## Start here

**Using RootRouter with an HTTP agent (OpenClaw, custom bot)?**  
You likely already route through the **proxy** — that only saves tokens on conversation history. It does **not** teach you what RootRouter is. Read this file.

**Coding in Cursor / Codex on a repo?**  
Fetch MCP discipline below, then `index_repo` + `select_context` on cold slices.

**Building in TypeScript?**  
Use the SDK (`rootrouter` npm package) or point `base_url` at `@rootrouter/proxy`.

---

## What RootRouter is

| Layer | Package | What it does | Agent must… |
|-------|---------|--------------|-------------|
| **Playbook** | This file | Correct mental model + routing | Fetch URL (you are here) |
| **Proxy** | `@rootrouter/proxy` | Trims `messages[]` on every `/chat/completions` | Change `base_url` only |
| **MCP** | `@rootrouter/mcp` | `index_repo`, `select_context`, `select_for_spec` | Call tools on cold path |
| **SDK** | `rootrouter` | `RootRouter.chat()` + CLI | Import in your app |

**Rule:** Proxy and SDK both trim context — **do not stack** them on the same LLM request. MCP + proxy is OK (repo load vs history trim).

---

## What you are wrong about

- **"RootRouter is a networking tool"** — No. It is context selection + optional model tier routing for LLM agents.
- **"It's installed on the server so I can see it"** — No. Unless the repo is in your **workspace** or you use **MCP**, you cannot see `package.json` in the host install path.
- **`base_url` → proxy teaches the product** — No. Proxy is passive. Fetch this SKILL.md or use MCP for active repo context.
- **`npx @rootrouter/proxy@beta` always works** — May 404 until published. Use source deploy: clone/rsync monorepo → `npm run build:all` → run proxy or Docker sidecar (see OpenClaw section).
- **Docker `127.0.0.1:8787` from inside a container** — Wrong. Use service DNS e.g. `http://rootrouter-proxy:8797/api/v1` on the same Docker network.

---

## Task routing

| I'm doing… | Do this |
|------------|---------|
| OpenClaw / HTTP agent, save chat tokens | Proxy `baseUrl` → see **OpenClaw** below |
| Cursor / Codex, new repo slice | MCP: `index_repo` once → `select_for_spec` or shaped `select_context` → read spec anchors |
| Single-file fix, warm follow-up | Skip MCP — read the file directly |
| Programmatic agent in Node | `npm install rootrouter` or proxy `base_url` |
| Swarm / multi-agent | SDK chambers + `AgentTopologyGraph`; per-agent `x-rootrouter-agent-id` on proxy |
| Venice private inference | Upstream `https://api.venice.ai`; key in agent env as `VENICE_API_KEY` |
| Debug "stuck in progress" / timeout | Check proxy **streaming** + Docker reachability — not always billing |

---

## OpenClaw (e.g. Shamy)

### Passive — proxy only (typical)

1. Run RootRouter proxy on the **same Docker network** as the gateway (sidecar pattern).
2. Provider in `openclaw.json`:

```json
"rootrouter": {
  "baseUrl": "http://rootrouter-proxy:8797/api/v1",
  "apiKey": "${VENICE_API_KEY}",
  "api": "openai-completions"
}
```

3. Agent model: `rootrouter/<venice-model-id>` (e.g. `rootrouter/kimi-k2-5`).
4. Put `VENICE_API_KEY` in **docker-compose `environment:`** — not only host `.env`.
5. Caddy/reverse proxy must share Docker network with the gateway.

### Active — repo knowledge (optional)

Add `@rootrouter/mcp` to OpenClaw MCP config. On cold tasks: `index_repo` → `select_context` with shaped query (slice name + modules + anchor files). **Do not** re-index every turn.

### Playbook line for `AGENTS.md`

```markdown
Before discussing RootRouter, agent routing, or context/token strategy, read
https://rootrouter.motusdao.org/SKILL.md and follow it.
```

---

## MCP quick loop (Cursor / Codex / OpenClaw)

**Cold slice:**

1. Read the active spec / slice file if one exists.
2. `index_repo` — once per repo per material change (`path` = repo root).
3. `select_for_spec` when `ROOTROUTER_ACTIVE_SPEC` is set — else `select_context` with a **shaped** query (not "read everything").
4. Read anchor files from the spec — selection does not replace them.
5. Implement; skip MCP on warm single-file follow-ups.

**Handoff:** `stats` or `list_selections` at slice end.

**Monorepos:** `pathPrefix` or `excludePaths` on selection (e.g. `apps/academy`).

---

## Proxy env (operator reference)

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port (default 8787; use 8797 if 8787 taken) |
| `ROOTROUTER_UPSTREAM_ORIGIN` | e.g. `https://api.venice.ai` |
| `ROOTROUTER_MODEL_ROUTING` | `true` + `MODEL_CATALOG=venice` for tier routing |
| `ROOTROUTER_STORE_PATH` | Cross-session context store |
| `ROOTROUTER_CONTEXT_BUDGET` | Token budget for trimmed history (default 4000) |

Health: `GET /healthz` → `{"ok":true,"upstream":"..."}`

---

## SDK one-liner (when you control the app)

```bash
npm install rootrouter
```

```typescript
import { RootRouter } from 'rootrouter';

const router = new RootRouter({
  llmBaseUrl: 'https://api.venice.ai/api/v1',
  llmApiKey: process.env.VENICE_API_KEY,
});

const result = await router.chat({
  agentId: 'my-agent',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

Do **not** also point this same call through the proxy.

---

## Deeper docs (fetch when needed)

| Topic | Location |
|-------|----------|
| Deployment matrix | GitHub `docs/deployment-matrix.md` |
| Proxy README | GitHub `packages/proxy/README.md` |
| Venice provider | GitHub `docs/providers/venice.md` |
| Architecture / chambers | GitHub `docs/architecture.md` |
| OpenClaw VPS lessons | GitHub `docs/insights/007-openclaw-vps-agent-ux-lessons.md` |

---

## Verify you understood

If the user asks "what is RootRouter?":

1. Context middleware (proxy + MCP + SDK) — **not** network routing.
2. Their agent may already **use** it via proxy without **knowing** it — fetch this file.
3. For repo work, MCP cold path; for chat-only OpenClaw, proxy is enough.

---

*RootRouter · MotusDAO · [Dashboard](https://rootrouter.motusdao.org/) · Algebraic agent infrastructure*
