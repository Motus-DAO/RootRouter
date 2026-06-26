# @rootrouter/mcp

Model Context Protocol server that exposes RootRouter's context-selection engine. Any MCP client (Codex, Cursor, OpenClaw, Hermes, or your own) can record candidate context and ask for the minimal relevant slice within a token budget — instead of stuffing entire histories or file trees into the prompt.

## Why

Agents burn tokens by sending everything. This server lets an agent:

1. `record_context` — stash file chunks, prior turns, tool outputs, or docs.
2. `select_context` — get back only what's relevant to the current query, fit to a token budget, deduplicated via Maximal Marginal Relevance.
3. `stats` — see how many tokens it has saved.

Selection is query-aware (cosine similarity is the primary signal) and works from the first recorded item. It never calls an LLM — your agent stays in control of the model call.

## Tools

| Tool | Input | Returns |
|------|-------|---------|
| `record_context` | `items: [{ id?, text, kind?, agentId?, metadata? }]` | count recorded, total store size |
| `select_context` | `query`, `tokenBudget?` (4000), `agentId?`, `mmrLambda?` (0.7), `baseline?` ('all') | selected items + tokens saved + reasoning |
| `stats` | none | store size, selections served, cumulative tokens saved |

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
| `ROOTROUTER_STORE_PATH` | `~/.rootrouter/store.json` | Where context is persisted across sessions |
| `ROOTROUTER_MAX_ITEMS` | unbounded | Cap stored items (oldest evicted) |
| `ROOTROUTER_USE_CHAMBERS` | `false` | Enable chamber-based relevance boosting |
| `EMBEDDING_API_KEY` | unset | If set, use a real embedding API instead of local TF-IDF |
| `EMBEDDING_API_URL` | `https://api.openai.com/v1/embeddings` | Embedding endpoint |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `EMBEDDING_DIMENSION` | `128` | Embedding dimension |

With no API key it runs fully local (TF-IDF), no network calls.

## Registration

### Cursor (`.cursor/mcp.json`)

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
2. Reload Cursor, or toggle the server in Settings -> MCP, so it picks up `.cursor/mcp.json`. You should see `rootrouter` with `record_context`, `select_context`, and `stats`.
3. The local context store is written to `.rootrouter/store.json` (gitignored).

Notes:

- The paths in `.cursor/mcp.json` are absolute (Cursor requires this). If you move or clone the repo elsewhere, update them.
- Runs fully local (TF-IDF) with no API key. For stronger embeddings, add `EMBEDDING_API_KEY` (and optionally `EMBEDDING_API_URL` / `EMBEDDING_MODEL`) to the `env` block; set `ROOTROUTER_USE_CHAMBERS=true` to enable chamber boosting.

## Typical agent loop

1. On new files/turns/tool output: call `record_context` with the chunks.
2. Before each model call: call `select_context` with the user's query and your token budget.
3. Inject only the returned items into the prompt.
4. Occasionally call `stats` to verify savings.
