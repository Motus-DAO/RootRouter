# @rootrouter/mcp

Model Context Protocol server that exposes RootRouter's context-selection engine. Any MCP client (Codex, Cursor, OpenClaw, Hermes, or your own) can record candidate context and ask for the minimal relevant slice within a token budget — instead of stuffing entire histories or file trees into the prompt.

## Why

Agents burn tokens by sending everything. This server lets an agent:

1. `record_context` — stash file chunks, prior turns, tool outputs, or docs.
2. `select_context` — get back only what's relevant to the current query, fit to a token budget, deduplicated via Maximal Marginal Relevance.
3. `stats` — store size, cumulative tokens saved (persisted), and last selection summary.
4. `list_selections` — read the persistent audit log of past `select_context` calls.

Selection is query-aware (cosine similarity is the primary signal) and works from the first recorded item. It never calls an LLM — your agent stays in control of the model call.

RootRouter **complements** spec + anchor files; it does **not** replace reading them.

## Cold vs warm (when to call tools)

```
New task → spec/slice or unfamiliar repo?
  YES → cold? → index_repo (once) → select_context → read spec + anchors → implement
  NO  → single file / already warm? → Read/edit directly (skip MCP)
```

- **Cold:** new chat, cross-module work, spec/slice kickoff — use `index_repo` + `select_context`.
- **Warm:** single-file fix, follow-up after anchors are in context — skip RootRouter.
- **Handoff:** `stats` / `list_selections` at slice end — not every turn. See [`docs/templates/slice-handoff.md`](../../docs/templates/slice-handoff.md).

**Monorepos:** pass `pathPrefix` or `excludePaths` on `select_context` to avoid sibling-app noise (e.g. Academy query with `pathPrefix: "apps/academy"`).

**Spec env:** `ROOTROUTER_ACTIVE_SPEC` (canonical) or `MOTUS_ACTIVE_SPEC` — point agents at the active slice spec path.

Every `select_context` appends one line to **`selections.jsonl`** (by default next to `store.json`) and updates cumulative counters in **`store.json`** so usage survives MCP process restarts.

## Tools

| Tool | Input | Returns |
|------|-------|---------|
| `index_repo` | `path`, `agentId?` | chunks indexed, edges/communities stats, store size |
| `record_context` | `items: [{ id?, text, kind?, agentId?, metadata? }]` | count recorded, total store size |
| `select_context` | `query`, `tokenBudget?` (4000), `agentId?`, `mmrLambda?` (0.7), `baseline?` ('all'), `pathPrefix?`, `excludePaths?` | selected items + tokens saved + reasoning |
| `select_for_spec` | `specPath?`, `tokenBudget?`, `agentId?`, `pathPrefix?`, `excludePaths?`, `useInferredPathPrefix?` | same as select_context + parsed spec metadata |
| `stats` | none | store size, selections served, cumulative tokens saved, audit log summary |
| `list_selections` | `limit?` (20), `agentId?`, `since?` (ms) | recent audit entries + aggregate summary |

## Install / build

From the monorepo root:

```bash
npm install
npm run mcp:build
```

This produces `packages/mcp/dist/server.js` (an executable `rootrouter-mcp` bin).

## Configuration (env)

| Variable | Default | Purpose |
|----------|---------|---------|
| `ROOTROUTER_STORE_PATH` | `~/.rootrouter/store.json` | Where context + cumulative selection stats are persisted |
| `ROOTROUTER_SELECTIONS_LOG_PATH` | `<store-dir>/selections.jsonl` | Append-only audit log (one JSON line per `select_context`) |
| `ROOTROUTER_MAX_ITEMS` | unbounded | Cap stored items (oldest evicted) |
| `ROOTROUTER_USE_CHAMBERS` | `false` | Enable chamber-based relevance boosting |
| `EMBEDDING_API_KEY` | unset | If set, use a real embedding API instead of local TF-IDF |
| `EMBEDDING_PROVIDER` | `tfidf` (or `api` when key set) | `tfidf`, `api`, or `local` |
| `EMBEDDING_LOCAL_MODEL` | `minilm` | `minilm` or `bge-small` when `EMBEDDING_PROVIDER=local` |
| `ROOTROUTER_ACTIVE_SPEC` | unset | Active slice spec path for `select_for_spec` |
| `MOTUS_ACTIVE_SPEC` | unset | Alias for `ROOTROUTER_ACTIVE_SPEC` |

**Embeddings:** TF-IDF is the zero-dependency default (no network). For monorepos, use `rootrouter init cursor --local-embeddings` to enable local MiniLM (`EMBEDDING_PROVIDER=local`).

## CLI setup (recommended)

From any project directory:

```bash
npx rootrouter@beta init codex    # appends ~/.codex/config.toml
npx rootrouter@beta init codex --project-store --write-agents-md   # per-repo config/store + AGENTS.md
npx rootrouter@beta init codex --project-store --write-agents-md --project-agent-id academy --local-embeddings
npx rootrouter@beta init cursor   # writes .cursor/mcp.json + agent rule
npx rootrouter@beta init cursor --local-embeddings   # + MiniLM for monorepos
npx rootrouter@beta init cursor --active-spec docs/specs/slice-4.md
npx rootrouter@beta index ./my-repo
```

Multi-repo Codex: use `--project-store` so each repo gets `~/.rootrouter/<slug>/codex-store.json`. Use `--write-agents-md` for persistent cold/warm discipline in `~/.codex/AGENTS.md` and `./AGENTS.md`. See [`docs/deployment-matrix.md`](../../docs/deployment-matrix.md).

`init cursor` also prints proxy env for Codex/SDK agents (Cursor uses MCP only today).

## Registration (manual)

### Published npm (beta)

`rootrouter init cursor` / `init codex` writes the config below automatically. Or set manually:

```json
{
  "mcpServers": {
    "rootrouter": {
      "command": "npx",
      "args": ["-p", "@rootrouter/mcp@beta", "rootrouter-mcp"],
      "env": {
        "ROOTROUTER_STORE_PATH": "~/.rootrouter/store.json"
      }
    }
  }
}
```

### Cursor (`.cursor/mcp.json`) — monorepo / local build

```json
{
  "mcpServers": {
    "rootrouter": {
      "command": "node",
      "args": ["/absolute/path/to/RootRouter/packages/mcp/dist/server.js"],
      "env": {
        "ROOTROUTER_STORE_PATH": "/absolute/path/to/.rootrouter/store.json"
      }
    }
  }
}
```

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.rootrouter]
command = "node"
args = ["/absolute/path/to/RootRouter/packages/mcp/dist/server.js"]

[mcp_servers.rootrouter.env]
ROOTROUTER_STORE_PATH = "/absolute/path/to/.rootrouter/store.json"
```

### Generic stdio MCP client (Hermes, OpenClaw, custom)

Spawn the bin and speak MCP over stdio:

```bash
node /absolute/path/to/RootRouter/packages/mcp/dist/server.js
```

Any client that supports stdio MCP servers can point its `command`/`args` at the bin above. After `npm link` (or publishing), `rootrouter-mcp` is also available on `PATH`:

```jsonc
{ "command": "rootrouter-mcp", "args": [] }
```

## Use in this repo (already wired)

This monorepo ships a ready-to-use config at [`.cursor/mcp.json`](../../.cursor/mcp.json):

```json
{
  "mcpServers": {
    "rootrouter": {
      "command": "node",
      "args": ["/Users/main/RootRouter/packages/mcp/dist/server.js"],
      "env": {
        "ROOTROUTER_STORE_PATH": "/Users/main/RootRouter/.rootrouter/store.json"
      }
    }
  }
}
```

Steps:

1. Build once: `npm run mcp:build` (from the repo root).
2. Reload Cursor, or toggle the server in Settings -> MCP, so it picks up `.cursor/mcp.json`. You should see `rootrouter` with `index_repo`, `record_context`, `select_context`, `stats`, and `list_selections`.
3. The local context store is written to `.rootrouter/store.json` (gitignored).

Notes:

- The paths in `.cursor/mcp.json` are absolute (Cursor requires this). If you move or clone the repo elsewhere, update them.
- Runs fully local (TF-IDF) with no API key. For stronger embeddings, add `EMBEDDING_API_KEY` (and optionally `EMBEDDING_API_URL` / `EMBEDDING_MODEL`) to the `env` block; set `ROOTROUTER_USE_CHAMBERS=true` to enable chamber boosting.

## Typical agent loop

1. On new files/turns/tool output: call `record_context` with the chunks (or `index_repo` once per repo / slice).
2. Before each model call: call `select_for_spec` (when spec env is set) or `select_context` with a shaped query.
3. Inject only the returned items into the prompt.
4. **Read the spec and anchor files** — selection complements, never replaces them.
5. At slice handoff: call `stats` or `list_selections` to capture savings for the handoff doc.

## Auditing MCP usage

From the shell (same env as MCP):

```bash
npm run audit:mcp
# or
npx rootrouter@beta audit --limit 30 --json
```

Reads `selections.jsonl` and prints per-query savings. In Cursor, call MCP `list_selections` for the same data without leaving the agent.

Legacy sessions (before this log existed) can only be reconstructed from Cursor `agent-transcripts` and `agent-tools/` outputs — not from RootRouter files.
