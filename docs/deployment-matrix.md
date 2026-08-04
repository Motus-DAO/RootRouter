# RootRouter deployment matrix

Where each layer runs, what it does, and how to combine them without stepping on storage or double-trimming context.

---

## Layers at a glance

| Layer | What it does | Typical host |
|-------|----------------|--------------|
| **MCP** (`@rootrouter/mcp`) | Active repo loading: `index_repo`, `select_context`, `select_for_spec` | Cursor IDE, Codex CLI |
| **Proxy** (`@rootrouter/proxy`) | Passive history trim on HTTP `base_url` clients | Codex apps, custom agents, SDK apps that point at proxy |
| **SDK** (`rootrouter`) | Programmatic `RootRouter.chat()` + CLI (`init`, `doctor`, `audit`) | Your application code |

**Rule:** MCP, proxy, and SDK are **alternative insertion points**, not a stack. Do not run SDK context trimming and proxy trimming on the same model request.

---

## By runtime

### Cursor IDE

| Capability | Supported? | Notes |
|------------|------------|-------|
| MCP (cold repo context) | Yes | Primary integration — `rootrouter init cursor` |
| Proxy (passive trim) | No | IDE chat does not route through a configurable `base_url` |
| SDK in IDE chat | No | SDK is for apps you build, not Cursor's built-in agent |
| Persistent rules | `.cursor/rules/rootrouter-mcp.mdc` | Phase-gated cold/warm workflow |

**Recommended setup**

```bash
npx rootrouter@beta init cursor --project-store --project-agent-id <slug>
# optional: --local-embeddings, --active-spec path/to/spec.md
```

Motus policy: **per-repo Cursor store is mandatory**; global `~/.rootrouter/store.json` is demos only.

Set `ROOTROUTER_ACTIVE_SPEC` in MCP env when working spec-driven slices.

---

### Codex CLI

| Capability | Supported? | Notes |
|------------|------------|-------|
| MCP | Yes | Global `~/.codex/config.toml` via `init codex` |
| Proxy | Optional | Only if you control the HTTP client's `base_url` |
| Persistent behavior | `AGENTS.md` | MCP gives tools; AGENTS.md gives discipline |

**Recommended setup (multi-repo / Motus workflow)**

```bash
cd your-repo
npx rootrouter@beta init codex \
  --project-store \
  --write-agents-md \
  --project-agent-id your-project-slug \
  --local-embeddings
```

This writes:

- `./.codex/config.toml` — project-scoped MCP server block pointing at this repo's isolated store
- `~/.codex/AGENTS.md` — global RootRouter discipline (merged section)
- `./AGENTS.md` — per-repo store path, `agentId`, spec path, budgets
- `~/.rootrouter/<project>/codex-store.json` — isolated store per repo

Without `--project-store`, `init codex` writes the MCP block to global `~/.codex/config.toml`.

Re-run `init codex --write-agents-md` in each repo to refresh project `AGENTS.md` after store or spec changes.

---

### OpenClaw / other HTTP agents

| Capability | Supported? | Notes |
|------------|------------|-------|
| MCP | If host supports MCP | Same tools as Cursor/Codex |
| Proxy | Yes | Point `base_url` at `http://localhost:8787` (see proxy README) |
| SDK | Yes | Embed `RootRouter.chat()` in your orchestrator |

Use proxy when the agent only speaks OpenAI-compatible HTTP and you cannot add MCP.

---

### SDK applications

| Capability | Supported? | Notes |
|------------|------------|-------|
| `RootRouter.chat()` | Yes | In-process routing + optional context pipeline |
| MCP | N/A | Separate process |
| Proxy | Optional | Alternative to in-SDK trim — pick one |

The SDK is **not** installed per consumer repo by default. Only apps that import `rootrouter` get SDK behavior.

---

## Storage hygiene

### One store per repository

Chunk IDs are **repo-qualified** (`repoNamespace` + relative path + line range). Sharing one `store.json` across multiple repos is **not production** — stores grow large, `agentId` scoping is retrieval-only, and concurrent writers can corrupt JSON.

| Pattern | Path | When |
|---------|------|------|
| **Per-project (Cursor)** | `~/.rootrouter/<slug>/cursor-store.json` | **Motus / production — mandatory** |
| **Per-project (Codex)** | `~/.rootrouter/<slug>/codex-store.json` | Multi-repo Codex — recommended |
| Global default | `~/.rootrouter/store.json` | **Demos / smoke only** |
| Dev override | `ROOTROUTER_STORE_PATH` env | CI, custom layouts |

**Cursor init (production):**

```bash
rootrouter init cursor --project-store --project-agent-id <slug>
# optional: --local-embeddings
```

This writes workspace `.cursor/mcp.json` with `ROOTROUTER_STORE_PATH` + `ROOTROUTER_DEFAULT_AGENT_ID`. Store **data** stays on the machine; the repo only commits the config pointer. See [insight 009](./insights/009-cursor-project-store-parity.md).

### Treat the store as disposable

- Truth lives in git: specs, anchor files, slice handoffs, ADRs
- Re-run `index_repo` after large refactors or when retrieval quality drops
- Set `ROOTROUTER_MAX_ITEMS` if the store grows without bound
- Rotate `selections.jsonl` periodically; never index secrets or `.env`

### Concurrent writers

There is **no file lock** on the JSON store. Do not run MCP `index_repo` and proxy writes against the same store file simultaneously.

---

## Cold vs warm (all runtimes)

```
New task → unfamiliar repo or spec-driven slice?
  YES → cold → index_repo (once) → select_for_spec / select_context → read anchors → implement
  NO  → single file / anchors already warm → edit directly; skip selection
```

See [slice-handoff template](./templates/slice-handoff.md) for session handoffs.

---

## Diagnostics

```bash
npx rootrouter@beta doctor          # env, store, MCP launch path
npx rootrouter@beta audit --limit 20  # recent selection audit log
```

---

## Related docs

- [MCP README](../packages/mcp/README.md) — tool surface, env vars
- [Proxy README](../packages/proxy/README.md) — headers, routing, when to enable
- [Insights roadmap Phase 9](./insights/004-insights-driven-roadmap.md#phase-9--platform-carryover-from-nextmd)
- [How RootRouter works](./insights/003-how-rootrouter-works-problem-and-fix.md)
