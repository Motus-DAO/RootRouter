# Insight 001 — Cursor agent review: slice workflow & MCP usage

**Captured:** 2026-06-27  
**Source:** Cursor agent session on a large multi-slice project (Academy slices 4/5, follow-up UX/perf work)  
**Status:** Raw feedback — pending batch triage for production

---

## Summary

A capable Cursor agent used RootRouter MCP (`index_repo`, `select_context`, `stats`) under real slice-handoff constraints. Verdict: **useful for cold starts and spec-driven slices; skip for warm, localized follow-ups.** Core value prop validated (~94% token savings on slice queries). Main quality gap: **noise in selected chunks**. Main adoption lever: **workflow rules**, not always-on tool discovery.

---

## Agent usage pattern

### When they used it

- **Required by slice handoff:** `index_repo` → `select_context` → read spec + selected chunks
- **Cold start on large/unfamiliar repo**
- **"Where does X live?"** across many modules
- **New slice or unfamiliar area**

### When they skipped it

- **Follow-up work** (flash fixes, progress bar, perf) — files already known (`LessonPlayer`, `PublicCourseDetail`, caches, APIs)
- **Small, localized changes**
- **Debugging one component or one API route**
- Re-pulling context would add overhead without marginal benefit

### Practical rule (agent-derived)

> **RootRouter for slice kickoff + unknown territory; direct reads for targeted fixes once oriented.**

This matches how the agent actually worked in the session — not a failure of adoption, but correct tool selection.

---

## What worked

| Aspect | Evidence |
|--------|----------|
| **`index_repo`** | Straightforward — one call, store is warm |
| **`select_context`** | Tight query + token budget replaced "read half the repo" with relevant chunks |
| **Token savings** | ~61k–63k tokens saved (~94%) vs stuffing whole baseline for slice 4/5 queries |
| **Spec-first fit** | Query anchored to acceptance criteria, not random exploration |
| **Small MCP surface** | Three tools felt approachable — not chatty or magical |
| **Positioning** | Works as a **"don't @ the whole repo" guardrail**, not a full autopilot brain |

---

## Pain points & caveats

| Issue | Detail |
|-------|--------|
| **Noise in results** | Slice 4 returned unrelated chunks (e.g. WaaP debug, PSM intake) alongside Academy spec — usable, not laser-focused |
| **Query quality dependency** | Garbage in → mediocre context; agent must know what to query |
| **Not a spec substitute** | Still need to read the active spec and 2–3 anchor files the spec names |
| **`stats` UX** | More session bookkeeping / handoff than day-to-day coding UX |
| **Friendliness** | "Moderately" — agent still interprets results and uses `Read`/`Grep` for gaps |

---

## Internal analysis (product read)

### Validates product direction

1. **Core value prop is real** — 94% savings on cross-repo slice queries is the promise working, not vanity metrics.
2. **Small MCP surface is a feature** — agents want a sharp knife, not ceremony.
3. **Spec-first workflows are the killer integration** — best usage when handoff *requires* the flow and anchors query to acceptance criteria.
4. **Skipping on follow-ups is rational** — once oriented, re-selection adds latency without benefit.
5. **Aligns with roadmap** — `docs/NEXT.md` decision: **proxy primary** for passive savings; **MCP for explicit control + `index_repo`**. Agent independently arrived at the same split.

### Agent persona (target user mental model)

> **Cold start on a big slice → yes. Warm session on known files → no.**

Optimize the cold-start path; don't fight agent heuristics for warm sessions.

---

## Actionable gaps (ranked for future batching)

### P0 — Noise in selection results

**Symptom:** Unrelated product areas appear in slice context (WaaP, PSM alongside Academy).

**Likely causes:**
- Default **TF-IDF** embeddings (no API key) are lexical, not semantic
- **Community cap** (`maxPerCommunity: 2`) limits per-directory spread but doesn't exclude whole unrelated areas
- No **path/spec scoping** on `select_context` — can't say "only under `apps/academy/`" or boost spec-mentioned paths

**Candidate fixes (to batch/triage):**
- [ ] `pathPrefix` / `excludePaths` on `select_context`
- [ ] Spec-aware boost when `MOTUS_ACTIVE_SPEC` (or similar env) is set
- [ ] Stronger default embeddings in `init cursor` (`EMBEDDING_PROVIDER=local` with MiniLM)
- [ ] Auto-query builder from spec acceptance criteria

### P1 — Query quality / adoption friction

**Symptom:** "You need to know what to query."

**Candidate fixes:**
- [ ] Cursor rule: always `index_repo` + `select_context` when `MOTUS_ACTIVE_SPEC` is set; skip for single-file fixes
- [ ] Example queries in MCP tool descriptions (spec slice pattern)
- [ ] Thin `select_for_spec` wrapper that reads spec path from env and builds query

### P2 — Reframe `stats`, don't delete

**Symptom:** Agents won't stare at `stats` while coding.

**Reframe as:**
- Handoff doc output (context budget used, cumulative savings)
- Dashboard / telemetry input (`selectionStats` in Convex snapshots already exists)

### P3 — Set expectations in docs/marketing

**Message:** RootRouter **complements** spec + anchor files; it does not replace them.

- Read the spec first
- Use `select_context` to **expand** from spec into repo
- Use `Read`/`Grep` to fill gaps selection missed

---

## Do not overreact to

| Feedback | Why it's fine |
|----------|---------------|
| "Not always-on" | Always-on adds overhead; fights agent heuristics |
| "Moderately friendly" | Acceptable for v0.2 beta; friendliness comes from rules + init |
| "Required by handoff worked best" | Adoption model = **workflow integration > tool discovery** |
| Skipped on perf/UX passes | Expected; don't optimize for warm-session path |

---

## Filed for production (triage backlog)

Items below are **not committed** — batch and prioritize before implementation.

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **Batch A** | Cursor rule for `MOTUS_ACTIVE_SPEC` gate | Low | High — immediate adoption consistency |
| **Batch A** | Query templates in MCP tool descriptions | Low | Medium — lowers skill floor |
| **Batch B** | `pathPrefix` / `excludePaths` on `select_context` | Medium | High — directly addresses noise |
| **Batch B** | Better default embeddings in `init cursor` template | Low–medium | Medium — better cross-module semantic matching |
| **Batch C** | Spec-aware selection boost / `select_for_spec` | Medium | High — spec-first workflow integration |
| **Batch C** | Handoff template that includes `stats` output | Low | Low–medium — trust/audit for multi-agent slices |

---

## Agent bottom-line table (original)

| Aspect | Take |
|--------|------|
| Useful for slice work? | **Yes** |
| Use on every task? | **No** |
| Replace reading the spec? | **No** |
| Worth keeping in workflow? | **Yes**, for indexed, spec-driven slices |

---

## Open questions (for insight review sessions)

1. Should `MOTUS_ACTIVE_SPEC` become a first-class env var in `init cursor` and MCP server docs?
2. Is TF-IDF acceptable for beta, or should local MiniLM be the default in init templates?
3. Does noise warrant path scoping first, or better embeddings first?
4. Should handoff docs auto-call `stats` and embed results, or is that agent responsibility?

---

## Changelog

| Date | Action |
|------|--------|
| 2026-06-27 | Initial capture from Cursor agent review + internal product analysis |
