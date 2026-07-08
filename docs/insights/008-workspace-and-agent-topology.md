# Insight 008 — Workspace topology and agent topology

**Captured:** 2026-07-01  
**Source:** Feng Shui skill integration + OpenClaw Shamy newborn onboarding  
**Status:** Product insight — Layer 0 companion to RootRouter  
**Related:** [FENG-SHUI.md](../FENG-SHUI.md) · [SKILL.md](../SKILL.md) · [007-openclaw-vps-agent-ux-lessons](./007-openclaw-vps-agent-ux-lessons.md)

---

## Summary

Agents reliably create filesystem mess: repos at `~/`, artifacts in Downloads, duplicate catch-all folders. RootRouter solves **runtime context topology** (chambers, agent graph, RepoGraph) but cannot fix **where agents write on disk**. Feng Shui is the workspace companion — Layer 0 before Layer 1.

---

## Three graphs, three layers

| Graph | Layer | Tool | Question answered |
|-------|-------|------|-------------------|
| **Filesystem** | 0 — Feng Shui | `workspace_guard.py`, placement policy | Where should durable work live? |
| **Repository** | 1 — RootRouter MCP | `index_repo`, RepoGraph | What is the code structure? |
| **Agent / interaction** | 1 — RootRouter SDK | `AgentTopologyGraph`, chambers | Who handles which task shape? |

Align physical layout with the graphs RootRouter builds:

- Index repos at their **canonical** path under `<projects-root>/<project>/repositories/`.
- One projects root per agent persona on multi-agent hosts.
- Run `index_repo` **before** moving modules — RepoGraph reveals import communities.

---

## Onboarding stack for newborn agents (Shamy)

```text
BOOTSTRAP.md  → record approved workspace root; fetch FENG-SHUI.md
AGENTS.md     → Layer 0 + Layer 1 playbook lines
tools/feng-shui/ → workspace_guard.py, inventory.py (copied by setup script)
proxy         → rootrouter/* models trim chat history (passive)
MCP (optional)→ index_repo + select_context on cold repo slices
```

`scripts/setup-openclaw-venice-shamy.sh` installs Layer 0 + Layer 1 into the Shamy workspace.

---

## Hosted playbooks

| URL | Layer |
|-----|-------|
| `https://rootrouter.motusdao.org/FENG-SHUI.md` | Workspace placement + harmonize |
| `https://rootrouter.motusdao.org/SKILL.md` | Context routing + MCP + proxy |

Landing page links both under **Agent onboarding**.

---

## What Feng Shui is not

- Not chamber math or model routing — that stays in the SDK.
- Not auto-moving user files without approval.
- Not a replacement for RootRouter MCP on code tasks.

---

*RootRouter · MotusDAO · Algebraic agent infrastructure*
