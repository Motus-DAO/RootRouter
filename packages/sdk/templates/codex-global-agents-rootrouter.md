## RootRouter context discipline

RootRouter MCP is available in every Codex session. It **complements** specs and anchor files — it is **not** the source of truth.

### When to use (cold path)

- New or unfamiliar repo area, cross-module discovery, spec-driven slice kickoff
- Flow: read spec → `index_repo` once per repo revision → `select_for_spec` (or `select_context`) → read anchor files → implement

### When to skip (warm path)

- Single-file fixes, known files already in context, localized follow-ups

### Selection defaults

- `tokenBudget`: 1500–3000 initially (raise only after quality is verified)
- Always use `pathPrefix` / `excludePaths` in monorepos
- Use the project `agentId` from the repo `AGENTS.md` RootRouter section
- Never record secrets, credentials, private keys, or customer data

### Handoff

- At slice end: MCP `stats` or `list_selections`
- Include: spec path, query used, anchor files read, gaps/noise, changed files, tests, unresolved risks

### Storage

- **One store per repository** — never share `store.json` across Motus repos
- Treat the store as a disposable index; rebuild after large refactors
- Keep durable decisions in git (specs, handoffs, ADRs)

### MotusDAO repository onboarding habit

- When starting work in a MotusDAO repository, check its `AGENTS.md` for a RootRouter project section before indexing.
- If the section or isolated project store is missing, tell the user and help run `rootrouter init codex --project-store --write-agents-md --project-agent-id <slug>` from that repository.
- Verify setup with `rootrouter doctor`, then use MCP `stats` after the first cold-slice selection.
- Do not silently reuse another repository's store or `agentId`.

### Layers (do not confuse)

| Layer | Codex use |
|-------|-----------|
| **MCP** | Primary for Codex coding — cold repo context |
| **Proxy** | Only for apps where you control `base_url` (not default Codex chat) |
| **SDK** | Only inside applications you build that call `RootRouter.chat()` |

Never stack SDK trimming and proxy trimming on the same model request.

See `docs/deployment-matrix.md` in the RootRouter repo for full matrix.
