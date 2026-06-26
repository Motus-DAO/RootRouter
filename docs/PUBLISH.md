# Publishing RootRouter packages

Three npm packages ship from this monorepo (publish **in this order**):

| Package | Bin | Purpose |
|---------|-----|---------|
| `rootrouter` | `rootrouter` | SDK + CLI (`index`, `init`, `snapshot`) |
| `@rootrouter/proxy` | `rootrouter-proxy` | Transparent OpenAI-compatible proxy |
| `@rootrouter/mcp` | `rootrouter-mcp` | MCP server for Codex, Cursor, etc. |

## One-liner install (after publish)

```bash
npm install rootrouter @rootrouter/proxy @rootrouter/mcp
npx rootrouter index ./my-repo
npx rootrouter init codex
npx rootrouter-proxy
npx rootrouter-mcp
```

## Local monorepo usage

```bash
npm run build:all
npm run index -w rootrouter -- index ./my-repo
node packages/mcp/dist/server.js
node packages/proxy/dist/server.js
```

## Publish from maintainer machine

1. Log in: `npm login`
2. Ensure `@rootrouter` scope access on npm (org or user)
3. From repo root:

```bash
npm run publish:packages
```

This builds all three packages and runs `npm publish -w` for each workspace.

## Versioning

Current release: **0.2.0-beta.0** (early beta — see [BETA.md](../BETA.md)).

Bump versions together in:

- `packages/sdk/package.json` (`rootrouter`)
- `packages/proxy/package.json`
- `packages/mcp/package.json`

Proxy and MCP depend on `rootrouter@^<same pre-release>`.

Legal files (`LICENSE`, `NOTICE`, `COMMERCIAL.md`, `BETA.md`) live at the repo root and are synced into each package before publish:

```bash
npm run legal:sync
```

## Agent setup (no publish required)

```bash
npx rootrouter init cursor   # writes .cursor/mcp.json
npx rootrouter init codex    # appends ~/.codex/config.toml
```

Optional proxy env snippet is printed after `init cursor`.

## Dashboard selection stats

Push context-engine stats to the topology dashboard:

```bash
export ROOTROUTER_STORE_PATH=~/.rootrouter/store.json
export DASHBOARD_URL=http://localhost:3000
npx rootrouter snapshot
```

Demos also attach `selectionStats` + `repoGraph` when `ROOTROUTER_STORE_PATH` is set.
