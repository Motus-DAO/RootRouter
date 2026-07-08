# Organize Space — Harmonize workflow

Companion to [FENG-SHUI.md](https://rootrouter.motusdao.org/FENG-SHUI.md). Use when a workspace is messy and needs assessment or reorganization.

## Safety contract

1. Treat every existing file as user-owned and potentially important.
2. Obtain an explicit target path before inspecting outside the active workspace.
3. Start read-only. Do not move, rename, overwrite, delete, deduplicate, archive, or edit files during assessment.
4. Do not inspect file contents unless the user authorizes content analysis or the task clearly requires specific workspace files.
5. Avoid secrets and high-risk locations by default (`.ssh`, `.gnupg`, credential stores, mail, browser profiles).
6. Present a concrete proposed operation list before making changes. Include source, destination, reason, collision behavior, and rollback method.
7. Obtain explicit approval for the proposed operation list. Approval to inspect is not approval to mutate.
8. Never delete duplicates automatically. Compare hashes only after authorization and report candidates for review.
9. Preserve metadata where practical and never overwrite a destination. Stop on collisions.
10. Verify approved changes and retain a machine-readable operation log suitable for rollback.

## Workflows

- **Assess:** inventory an existing location and report its condition without changing it.
- **Design:** propose a structure for a new directory, workspace, or repository.
- **Harmonize:** assess → design → plan → approve → apply → verify.

Default to **Assess** when intent is ambiguous.

## Assess

1. Confirm the exact target and inspection boundary.
2. Run `python3 tools/feng-shui/inventory.py TARGET --max-depth 2` (read-only JSON).
3. For software repos, also use `rg --files` or RootRouter `index_repo` for structure.
4. Summarize evidence: major categories, concentration, age bands, oversized files, generated material, structural friction.
5. Recommendations: keep in place, reorganize, review manually.

## Harmonize plan format

For every operation:

```text
operation: move | rename | create-directory | archive
source: absolute path, when applicable
destination: absolute path
reason: short evidence-based explanation
collision_policy: stop
rollback: inverse operation
```

Show the full plan before execution. Do not add deletion to a harmonization plan.

## Principles

- **Flow:** obvious paths from intake → active work → archive.
- **Locality:** keep items together when they change or are retrieved together.
- **Boundaries:** separate active, reference, generated, temporary, archived, and sensitive material.
- **Balance:** avoid catch-all folders and empty speculative trees.
- **Reversibility:** small batches, collision-safe moves, operation logs, verification.

---

*Organize Space · RootRouter workspace companion*
