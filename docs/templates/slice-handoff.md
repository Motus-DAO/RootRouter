# Slice handoff

Copy this block at the end of a slice or when handing off to another agent.

---

## Spec

- **Path:** `<!-- e.g. docs/specs/academy-slice-4.md or $ROOTROUTER_ACTIVE_SPEC -->`
- **Slice / AC:** <!-- title + acceptance criteria ids -->

## RootRouter

- **Indexed:** <!-- yes/no; repo path if yes -->
- **`select_context` query:**
  ```
  <!-- paste exact query used -->
  ```
- **Path scope:** <!-- pathPrefix / excludePaths if used, else "none" -->
- **Anchor files read:** <!-- list files you Read after selection -->
- **`stats` snapshot:**
  - Items in store:
  - Tokens saved (cumulative):
  - Last selection % saved:

Or run: `npx rootrouter@beta audit --limit 5` / MCP `list_selections`.

## Gaps / noise

- <!-- chunks selection missed; unrelated modules that slipped through -->

## Next agent

- <!-- what to do first; warm path — skip re-index if store is current -->
