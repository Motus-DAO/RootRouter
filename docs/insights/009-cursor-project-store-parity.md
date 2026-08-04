# Insight 009 — Cursor project-store parity (Motus storage policy)

**Captured:** 2026-08-04  
**Status:** Slice contract — implement in `0.2.0-beta.1`  
**Driver:** Global Cursor MCP + shared `~/.rootrouter/store.json` creates multi-repo “stews”; Codex already has `--project-store`

---

## Policy (locked)

| Mode | Store path | When |
|------|------------|------|
| **Production / Motus** | `~/.rootrouter/<slug>/cursor-store.json` | Mandatory — one store per git repo |
| **Demos / smoke** | `~/.rootrouter/store.json` or `demo-store.json` | Explicit opt-in only |

- Store **data** lives on the machine (under `~/.rootrouter/`), not as committed repo source.
- Repo holds the **pointer**: `.cursor/mcp.json` → `ROOTROUTER_STORE_PATH` + `ROOTROUTER_DEFAULT_AGENT_ID`.
- Skills/rules teach *when* to index; **CLI init** creates isolation. Do not rely on agents to invent store paths.

---

## Acceptance criteria

1. `rootrouter init cursor --project-store [--project-agent-id <slug>]`  
   - Writes `.cursor/mcp.json` with per-project `ROOTROUTER_STORE_PATH`  
   - Sets `ROOTROUTER_DEFAULT_AGENT_ID` (default = directory slug)  
   - Creates store directory; writes/refreshes `.cursor/rules/rootrouter-mcp.mdc`  
2. MCP `index_repo` / `select_*` use `ROOTROUTER_DEFAULT_AGENT_ID` when `agentId` omitted  
3. `rootrouter doctor` warns when Cursor MCP points at the **global** default store, and when a store file contains **multiple `repoRoot` namespaces**  
4. Docs/templates/skill state: Motus = project store; global = demos only  
5. Re-init **RootRouter** and **marketingOSmotusdao** with distinct slugs; global `~/.cursor/mcp.json` points at `demo-store.json` only

---

## Non-goals

- Multi-tenant graph DB / cloud sync  
- Auto-merging open Cursor workspaces into one MCP process  
- Changing chamber / selection math  

---

## Versioning

- npm: `rootrouter`, `@rootrouter/mcp`, `@rootrouter/proxy` → **`0.2.0-beta.1`**  
- Additive flags + doctor checks; note Motus re-init in BETA / deployment matrix  

---

## Verify

```bash
cd <repo> && rootrouter init cursor --project-store --project-agent-id <slug>
rootrouter doctor
# MCP: index_repo → store only that repo; second repo → separate cursor-store.json
```
