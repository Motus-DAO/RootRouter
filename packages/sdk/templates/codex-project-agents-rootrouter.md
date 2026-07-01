## RootRouter (this project)

| Setting | Value |
|---------|-------|
| **agentId** | `{{AGENT_ID}}` |
| **store** | `{{STORE_PATH}}` |
| **repo root** | `{{REPO_PATH}}` |
| **active spec** | `{{ACTIVE_SPEC}}` |
| **tokenBudget** | 2500 (start here; tune after quality review) |
| **pathPrefix** | *(set for monorepos, e.g. `apps/academy`)* |
| **excludePaths** | *(set sibling apps to drop, e.g. `apps/waap`)* |

### Cold slice workflow

1. Read the active spec (if set)
2. `index_repo` with `path` = repo root — once per material repo change
3. `select_for_spec` when spec env is set, else `select_context` with shaped query + `pathPrefix`
4. Read anchor files from the spec directly
5. Implement with targeted reads; skip RootRouter on warm follow-ups

### Store hygiene

- Re-index after major refactors or when retrieval quality drops
- Set `ROOTROUTER_MAX_ITEMS` in MCP env if the store grows large
- Do not index secrets, `.env`, or customer exports

Handoff template: `docs/templates/slice-handoff.md` (RootRouter monorepo) or your project's equivalent.
