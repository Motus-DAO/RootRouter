---
name: feng-shui
description: Establish and preserve orderly agent workspaces before files are created. Workspace companion to RootRouter (Layer 0). Use when scaffolding repos, choosing output directories, reorganizing workspaces, or harmonizing clutter. Hosted at https://rootrouter.motusdao.org/FENG-SHUI.md
---

# Feng Shui (RootRouter workspace companion)

Canonical agent playbook: **https://rootrouter.motusdao.org/FENG-SHUI.md**

Repo copy: [`docs/FENG-SHUI.md`](../../FENG-SHUI.md)

## When to use

- Newborn agent before first write (with RootRouter SKILL.md as Layer 1)
- Scaffolding a repository or project workspace
- Messy Desktop, Downloads, or home-root clutter
- Before relocating or restructuring code (pair with RootRouter `index_repo`)

## Tools in this repo

| Tool | Path |
|------|------|
| Workspace guard | `docs/skills/feng-shui/scripts/workspace_guard.py` |
| Directory inventory | `docs/skills/organize-space/scripts/inventory.py` |
| Placement policy | `docs/skills/feng-shui/references/placement-policy.md` |
| OpenClaw AGENTS fragment | `docs/skills/feng-shui/assets/openclaw/AGENTS.fragment.md` |
| Shamy onboarding template | `docs/templates/shamy-agents-onboarding.md` |

## Shamy install

`scripts/setup-openclaw-venice-shamy.sh` copies tools to `tools/feng-shui/` and merges Layer 0 + Layer 1 into `AGENTS.md`.
