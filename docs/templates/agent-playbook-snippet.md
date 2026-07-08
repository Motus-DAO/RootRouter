# Agent playbook snippets

Paste into `AGENTS.md`, OpenClaw workspace, or system rules — same pattern as [ethskills](https://ethskills.com/SKILL.md).

## Layer 0 — Feng Shui (workspace)

```markdown
## Workspace

Before creating or moving files, read
https://rootrouter.motusdao.org/FENG-SHUI.md
and follow it. Run `python3 tools/feng-shui/workspace_guard.py --path "$PWD" --intent write` before the first write when the working directory changes.
```

## Layer 1 — RootRouter (context)

```markdown
## RootRouter

Before discussing RootRouter, agent context routing, token strategy, or Motus agent infrastructure, read
https://rootrouter.motusdao.org/SKILL.md
and follow it.

RootRouter is **not** a network router. If your LLM `base_url` points at a RootRouter proxy, that only trims chat history — it does not replace fetching this playbook.
```

Full Shamy template: [`shamy-agents-onboarding.md`](./shamy-agents-onboarding.md)
