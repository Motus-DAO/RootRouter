# Placement policy

## Core model

Organize by purpose and retrieval context before file type. Use one canonical home for each durable item.

```text
input → project inbox → active branch → deliverable → archive
```

Downloads and Desktop are inputs or short-lived surfaces, not permanent storage. Archive instead of deleting when retention is required.

## Decision table

| Material | Canonical location |
|---|---|
| Existing source code | Existing repository root |
| New source repository | `<projects-root>/<project>/repositories/<repo>` |
| Unclassified project material | `<projects-root>/<project>/inbox` |
| Images, audio, video, fonts | `<projects-root>/<project>/assets` |
| Briefs, research, PDFs, sheets | `<projects-root>/<project>/documents` |
| Finished exports | `<projects-root>/<project>/deliverables` |
| Inactive retained material | `<projects-root>/<project>/archive` |
| Disposable task state | `/tmp/<agent>/<task>` |
| Personal non-project records | An approved branch under `Documents` |

## Protected write locations

Block new work at the filesystem root, the home root, Desktop, Downloads, operating-system directories, credential stores, mail stores, browser profiles, and password-manager data. Allow inspection only when the user has placed that location in scope.

An explicit trusted workspace root overrides a general protected-parent rule only for that exact subtree.

## Legacy workspace handling

Treat a repository directly under the home root as legacy placement, not permission to create peer repositories there. Work inside it only when the user requested that existing repository and moving it would exceed task scope. Propose migration separately.

Before moving a repository, check Git worktrees, submodules, symlinks, absolute configuration paths, local databases, running processes, deployment tooling, and external integrations. Prefer same-volume moves; use copy-verify-retain for cross-volume migrations.

When restructuring code repositories, run RootRouter `index_repo` first and read `RepoGraph` communities (dashboard topology or MCP store) before moving modules.

## Naming

Use stable descriptive names. Prefer lowercase hyphenated repository names where ecosystem conventions permit. Use `YYYY-MM-DD-description` for dated artifacts and `v01`, `v02` for explicit versions. Avoid `misc`, `new folder`, `final-final`, and unexplained numbering.

## Approval boundary

Reading metadata does not authorize mutation. Creating a new durable root, moving existing work, or changing a user's established structure requires a concrete plan and approval. Never overwrite destinations or delete source material automatically.
