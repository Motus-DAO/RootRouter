# Shamy newborn agent — AGENTS.md template

Paste or merge into OpenClaw Shamy workspace `AGENTS.md`. `setup-openclaw-venice-shamy.sh` prepends this automatically.

```markdown
## Workspace (Layer 0)

Before creating or moving files, read
https://rootrouter.motusdao.org/FENG-SHUI.md
and follow it. Run `python3 tools/feng-shui/workspace_guard.py --path "$PWD" --intent write` before the first write of each task (when cwd changes). Never create projects at the home root, Desktop, or Downloads.

## RootRouter (Layer 1)

Before discussing RootRouter, agent context routing, token strategy, or Motus agent infrastructure, read
https://rootrouter.motusdao.org/SKILL.md
and follow it.

RootRouter is **not** a network router. This agent uses `rootrouter/*` models — the proxy trims chat history only. Fetch the playbook for repo work and correct mental models.
```

Optional `BOOTSTRAP.md` fragment:

```markdown
## Establish workspace order

During bootstrap, identify and record the approved workspace root and projects root. Read
https://rootrouter.motusdao.org/FENG-SHUI.md
before scaffolding. Do not create the projects root or relocate existing material without user approval.
```
