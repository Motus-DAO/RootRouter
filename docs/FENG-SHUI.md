# Feng Shui — Workspace companion for RootRouter agents

Agents create mess by default: repos at the home root, artifacts in Downloads, duplicate `misc` folders. **Feng Shui is Layer 0** — place work deliberately *before* RootRouter trims context (Layer 1).

**Canonical URL:** `https://rootrouter.motusdao.org/FENG-SHUI.md`  
**Companion:** [RootRouter SKILL.md](https://rootrouter.motusdao.org/SKILL.md) (context routing, MCP, proxy)  
**Source:** [github.com/RootRouter/RootRouter](https://github.com/RootRouter/RootRouter) · `docs/skills/feng-shui/`

---

## Newborn agent — read this first

1. **Fetch both playbooks** before your first write:
   - Layer 0 (this file) — where files live
   - Layer 1 — [SKILL.md](https://rootrouter.motusdao.org/SKILL.md) — what context goes to the LLM
2. Run `pwd`. Identify the task purpose and nearest repo or workspace root.
3. Run the workspace guard (see below). Continue only when status is `allowed`.
4. If the workspace is already messy, run **Harmonize** (below) — assess first, mutate only after approval.
5. For repo work, then follow RootRouter MCP: `index_repo` once → shaped `select_context`.

```text
Layer 0 Feng Shui (where) → Layer 1 RootRouter (what context) → proxy/SDK (trimmed prompt)
```

---

## Prime directive

Never create project work directly in `/`, the user's home root, Desktop, Downloads, system directories, or another unapproved catch-all location.

Treat the current directory as evidence, not permission. Validate it before the first write.

---

## Start every write-capable task

1. Run `pwd` and identify the requested project or purpose.
2. Locate the nearest existing repository or declared workspace root.
3. Run the workspace guard:

```bash
python3 tools/feng-shui/workspace_guard.py --path "$PWD" --intent write
```

If `tools/feng-shui/workspace_guard.py` is missing, fetch it:

```bash
mkdir -p tools/feng-shui
curl -fsSL https://rootrouter.motusdao.org/feng-shui/scripts/workspace_guard.py \
  -o tools/feng-shui/workspace_guard.py
chmod +x tools/feng-shui/workspace_guard.py
```

Add `--allowed-root PATH` for each workspace root explicitly provided by the user or runtime.

4. Continue only when the guard reports `allowed`.
5. If it reports `review` or `blocked`, do not create files. Propose the correct location and obtain approval when creating or relocating a workspace would change user state.

Do not repeatedly run the guard during one task unless the working directory changes.

---

## Choose the destination

Use this precedence:

1. **Existing repository:** work inside its repository root and follow its conventions.
2. **Existing project workspace:** place material in the matching project branch.
3. **New repository:** use `<projects-root>/<project>/repositories/<repo>`.
4. **Project inputs:** use `<projects-root>/<project>/inbox` until classified.
5. **Project assets:** use `<projects-root>/<project>/assets`.
6. **Project documents:** use `<projects-root>/<project>/documents`.
7. **Finished outputs:** use `<projects-root>/<project>/deliverables`.
8. **Disposable work:** use `/tmp/<agent>/<task>` and do not treat it as durable storage.
9. **Uncertain durable material:** use the project's `inbox`, not a new miscellaneous folder.

Full policy: [placement-policy.md](https://rootrouter.motusdao.org/feng-shui/references/placement-policy.md)

---

## New project contract

Before scaffolding, state the proposed absolute path and why it is appropriate. Prefer an existing configured projects root. If none exists, propose `$HOME/Projects`; do not create it without approval.

Create only the branches the project currently needs:

```text
<project>/
├── inbox/
├── repositories/
├── assets/
├── documents/
├── deliverables/
└── archive/
```

Do not create empty speculative hierarchies. Keep repositories intact inside `repositories/`; do not mix unrelated project assets into source trees.

---

## Harmonize an existing mess

When the user asks to clean up, or you find clutter in Desktop/Downloads/home root:

1. **Assess** — read-only inventory. Do not move, rename, or delete during assessment.
2. **Design** — propose a shallow structure with stable categories.
3. **Plan** — list exact operations with source, destination, reason, collision policy (`stop`), and rollback.
4. **Approve** — obtain explicit user approval for the operation list.
5. **Apply** — execute approved moves only; log operations for rollback.

Inventory script (fetch if missing):

```bash
python3 tools/feng-shui/inventory.py TARGET --max-depth 2
```

Harmonize details: [ORGANIZE-SPACE.md](https://rootrouter.motusdao.org/feng-shui/ORGANIZE-SPACE.md)

For code repositories, run RootRouter `index_repo` before restructuring modules — use RepoGraph communities from the topology dashboard.

---

## Multi-agent hosts (e.g. OpenClaw Shamy)

- One **projects root per agent persona** when possible: `~/Projects/<agent-name>/`.
- Agent workspace (`AGENTS.md`, tools) stays separate from user project trees.
- Per-agent RootRouter store: use `x-rootrouter-agent-id` on the proxy.

---

## Finish the task

Before handoff:

1. Report where new files were created.
2. Confirm no output escaped the approved workspace.
3. Identify temporary files and whether they remain.
4. Log moves or structural mutations with rollback instructions.
5. Leave Downloads, Desktop, and the home root no more cluttered than before.

---

## Playbook lines for `AGENTS.md`

**Layer 0 — Feng Shui:**

```markdown
Before creating or moving files, read https://rootrouter.motusdao.org/FENG-SHUI.md and follow it.
```

**Layer 1 — RootRouter:**

```markdown
Before discussing RootRouter, agent routing, or context/token strategy, read
https://rootrouter.motusdao.org/SKILL.md and follow it.
```

---

*Feng Shui · RootRouter workspace companion · MotusDAO*
