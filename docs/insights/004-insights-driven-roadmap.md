# Insight 004 — Insights-driven roadmap

**Captured:** 2026-06-27  
**Status:** Active planning — batch for production from here  
**Sources:** [001](./001-cursor-agent-slice-workflow-feedback.md) · [002](./002-agent-context-behavior-good-vs-bad.md) · [003](./003-how-rootrouter-works-problem-and-fix.md) · [006](./006-mcp-selection-audit-log.md) (shipped audit)  
**Engineering backlog:** [`docs/NEXT.md`](../NEXT.md) (platform phases, mostly shipped MVP)

---

## How this relates to `NEXT.md`

| Doc | Scope |
|-----|--------|
| **`docs/NEXT.md`** | Platform vision — proxy, RepoGraph, embeddings, npm, dashboard. Phases 1–4 largely **done (MVP)**. |
| **This file** | **Insight-derived work** — adoption, selection quality, workflow integration, devrel. What real agent feedback files as **next production batches**. |

North star unchanged from NEXT.md:

> Sessions that would send 50k+ tokens routinely send 5–15k of *relevant* context — repo + conversation — with minimal agent discipline.

Insights refined *how* to get there: **phase-gated MCP + proxy + rules**, not always-on tooling.

---

## What insights validated (don't rebuild)

These are **confirmed working** — protect them while shipping below:

- [x] `index_repo` → `select_context` on cold slice kickoff (~94% savings vs full baseline)
- [x] Small MCP surface (`index_repo`, `select_context`, `stats`, `record_context`)
- [x] Skip RootRouter on warm, single-file follow-ups — correct agent behavior
- [x] Proxy + MCP are **complementary layers** (active load vs passive trim)
- [x] Spec-first workflow is the killer integration pattern
- [x] Stateful proxy + RepoGraph + graphBoost MVP (see NEXT.md)

---

## Phase 5 — Adoption & workflow (Batch A)

**Goal:** Make good agent behavior the default without requiring tool discovery.  
**Insight driver:** 001 (adoption lever = rules), 002 (handoff-enforced), 003 (deployment matrix)  
**Effort:** Low · **Impact:** High · **Target:** next production batch

### 5.1 Cursor rules & init

- [x] Ship `.cursor/rules/rootrouter.mdc` (or skill update) with phase-gated rule:
  - When `ROOTROUTER_ACTIVE_SPEC` (or `MOTUS_ACTIVE_SPEC`) is set **and** chat is cold → `index_repo` + `select_context`
  - Skip for single-file fixes and warm follow-ups
- [x] `rootrouter init cursor` — optionally write rule file alongside `mcp.json`
- [x] Document env var naming: support `ROOTROUTER_ACTIVE_SPEC` as canonical; alias `MOTUS_ACTIVE_SPEC` in docs
- [x] `init cursor` output: print the rule snippet + when to skip

### 5.2 MCP tool descriptions (query templates)

- [x] `select_context` description: example query shaped like acceptance criteria + module names
- [x] `index_repo` description: call once per repo revision / slice kickoff, not every turn
- [x] `stats` description: reframe as handoff/audit tool, not in-loop UX

### 5.3 Messaging & expectations

- [x] README / MCP README bullet: "Complements spec + anchor files; does not replace them"
- [x] Add cold vs warm decision tree to MCP README (from Insight 002)
- [x] `init cursor` comment block: note proxy stack for Codex/custom agents; Cursor is MCP-only today

### 5.4 Handoff template

- [x] Add `docs/templates/slice-handoff.md` with fields:
  - Spec path
  - `select_context` query used
  - Anchor files read
  - `stats` snapshot (tokens saved, store size)
  - Known noise / gaps
- [x] Link template from insight docs and init output

**Outcome:** Agents consistently use RootRouter on cold slices; skip rationally on warm work.

---

## Phase 6 — Selection quality (Batch B)

**Goal:** Fix noise in cross-module selection (WaaP/PSM alongside Academy).  
**Insight driver:** 001 P0, 003 open questions  
**Effort:** Medium · **Impact:** High

### 6.1 Path scoping on `select_context`

- [x] Add `pathPrefix?: string | string[]` to MCP `select_context` schema
- [x] Add `excludePaths?: string | string[]` to filter unrelated product areas
- [x] Filter candidates in `ContextEngine` / `ContextSelector` before scoring
- [x] Unit tests: prefix excludes sibling apps; excludePaths drops WaaP when querying Academy

### 6.2 Better default embeddings in init

- [x] `init cursor` template: document `EMBEDDING_PROVIDER=local` + `EMBEDDING_LOCAL_MODEL=minilm` as recommended for monorepos
- [x] Optional: opt-in flag `rootrouter init cursor --local-embeddings` to write env into `mcp.json`
- [x] Decision doc: TF-IDF remains zero-dep default; local MiniLM is **recommended** for multi-module repos

### 6.3 Selection transparency

- [x] Return `reasoning` / per-item scores in MCP `select_context` response (if not already surfaced clearly)
- [x] Log dropped candidate count when path filter applied

**Outcome:** Slice 4-style queries return Academy-focused chunks, not lexical collisions from other apps.

**Open decision:** Ship path scoping **before** embedding default change (faster, deterministic) — see [Decision log](#decision-log).

---

## Phase 7 — Spec-native selection (Batch C)

**Goal:** Lower query skill floor; tie selection to spec-driven workflows.  
**Insight driver:** 001 P1, 002 engineering levers  
**Effort:** Medium · **Impact:** High

### 7.1 Spec env + boost

- [x] First-class `ROOTROUTER_ACTIVE_SPEC` env read by MCP server
- [x] When set: boost chunks whose `metadata.path` appears in spec text or anchor file list
- [x] Optional: auto-append spec title / slice id to query if agent passes empty/minimal query

### 7.2 `select_for_spec` (thin wrapper)

- [x] New MCP tool OR `select_context` mode: `select_for_spec({ specPath?, tokenBudget? })`
- [x] Parses spec for: title, acceptance criteria bullets, backtick file paths
- [x] Builds query string + path hints automatically
- [x] Falls back to manual `select_context` if spec missing

### 7.3 Auto-query builder (SDK)

- [x] `buildQueryFromSpec(specText: string): string` in SDK for reuse by MCP, CLI, rules
- [x] Test fixtures from real slice specs (Academy-style)

**Outcome:** Garbage-in queries reduced; spec-first workflow is one tool call, not prompt engineering.

---

## Phase 8 — Observability & handoff audit

**Goal:** Make savings and context decisions visible for multi-agent slices.  
**Insight driver:** 001 P2, 003 end-to-end example  
**Effort:** Low–medium · **Impact:** Medium

### 8.1 Stats as handoff artifact

- [x] **Shipped 2026-06-29:** Persistent `selections.jsonl` audit log (one line per `select_context`)
- [x] **Shipped 2026-06-29:** Cumulative `totalSelections` / `totalTokensSaved` persisted in `store.json` (`engineStats`)
- [x] **Shipped 2026-06-29:** MCP tool `list_selections` + CLI `rootrouter audit` / `npm run audit:mcp`
- [x] **Shipped 2026-06-29:** `stats` returns last selection + audit log path/summary
- [x] Document `stats` in handoff template (Phase 5.4)
- [x] Dashboard: ensure `selectionStats` from handoff-friendly fields are labeled in UI

### 8.2 `rootrouter doctor`

- [x] CLI command: verify store path exists, chunk count, MCP server reachable, embedding provider, proxy health (if configured)
- [x] Print: recommended next step (`index ./repo` if store empty)
- [x] Exit codes for CI / onboarding scripts

### 8.3 Proxy headers in docs

- [x] Document `x-rootrouter-tokens-saved`, `x-rootrouter-store-recalled` in proxy README + insight 003
- [x] Codex init snippet: full MCP + proxy + shared store one-liner

**Outcome:** Teams trust savings numbers and debug misconfiguration quickly.

---

## Phase 9 — Platform carryover (from `NEXT.md`)

**Goal:** Finish engineering items not covered by insights but still on platform backlog.  
**Source:** [`docs/NEXT.md`](../NEXT.md) Phase 2.4+, open questions

### 9.0 Multi-repo storage & Codex persistence

- [x] Repo-qualified chunk IDs (`repoNamespace` in `chunkId` — prevents cross-repo collisions)
- [x] `rootrouter init codex --project-store` → `~/.rootrouter/<slug>/codex-store.json`
- [x] `rootrouter init codex --write-agents-md` → `~/.codex/AGENTS.md` + `./AGENTS.md`
- [x] [`docs/deployment-matrix.md`](../deployment-matrix.md)

### 9.1 Runtime ↔ repo bridge

- [ ] Strengthen `turn → file` edges in store metadata over time (NEXT 2.4)
- [ ] Optional: chamber id from `InteractionGraph` boosts repo nodes in same chamber region

### 9.2 Incremental index

- [ ] File watcher → re-chunk changed files → upsert store (NEXT 2.5 deferred)
- [ ] `index_repo` incremental mode or `rootrouter watch ./repo`

### 9.3 Cursor proxy gap (documentation / research)

- [ ] Research: any supported path to route Cursor API traffic through local proxy
- [x] Document "Cursor = MCP layer; Codex/SDK = full stack" — [`docs/deployment-matrix.md`](../deployment-matrix.md)
- [ ] Evaluate Cursor hook / automation to call proxy for external scripts only

### 9.4 Telemetry

- [ ] Decision: on-chain `tokensSaved` from proxy vs off-chain only (NEXT open Q3)
- [ ] Wire proxy selection stats into Celo telemetry if go-ahead

**Outcome:** Platform depth without blocking insight-driven UX wins.

---

## Phase 10 — Devrel & content

**Goal:** Turn insights into outward-facing material; attract spec-driven teams.  
**Insight driver:** 002 article outline, 003 product explainer  
**Effort:** Medium · **Impact:** Medium (distribution)

### 10.1 Article (from Insight 002 outline)

- [ ] Draft: *Engineering Agent Context: Good Behavior vs Prompt Stuffing*
- [ ] Include: context wheel, cold/warm, 94% case study, MCP + proxy stack
- [ ] Decision: Cursor-specific vs tool-agnostic lead

### 10.2 Insights index

- [ ] `docs/insights/README.md` — index 001–004 with one-line summary and status
- [ ] Link from main README "For agent authors"

### 10.3 Example repo / demo

- [ ] Minimal "slice handoff" demo in `packages/sdk/demo/` showing index → select → stats
- [ ] Record tokens saved in demo output for marketing

**Outcome:** Clear story for teams adopting spec-driven multi-agent workflows.

---

## Phase 11 — Deferred (post-insight backlog)

Not insight-urgent; keep on radar after Phases 5–8.

| Item | Source |
|------|--------|
| Call graph via Tree-sitter / `ts-morph` | NEXT 2.5 |
| Leiden clustering in TypeScript | NEXT 2.5 |
| PDF / diagram / vision ingest | NEXT 2.5 |
| Graphify `graph.json` import adapter | NEXT 2.5 |
| ANN tuning / recall thumbs-down UX in dashboard | NEXT 3.3 |
| Monorepo meta-package vs scoped only | NEXT open Q4 |

---

## Execution order (recommended)

Ship in this sequence — each phase unlocks the next:

```
Phase 5 (Batch A)  Adoption & rules     ← ship first, zero engine risk
       ↓
Phase 6 (Batch B)  Path scope + embeds ← fixes noise (top quality complaint)
       ↓
Phase 7 (Batch C)  Spec-native select   ← lowers skill floor
       ↓
Phase 8            Doctor + handoff     ← trust + ops
       ↓
Phase 9            Platform carryover   ← parallel when capacity allows
       ↓
Phase 10           Devrel               ← after Batch A–C so docs match product
```

### Sprint-sized batches

| Sprint | Ship | Success metric |
|--------|------|----------------|
| **S1** | Phase 5 complete | New slice chat uses index+select when spec env set |
| **S2** | Phase 6.1 path scoping | Academy query excludes unrelated app chunks in test fixture |
| **S3** | Phase 6.2 local embeddings in init | Monorepo init docs recommend MiniLM |
| **S4** | Phase 7 `select_for_spec` MVP | One-call selection from spec path |
| **S5** | Phase 8 doctor + handoff template | `rootrouter doctor` passes on fresh install |
| **S6** | Phase 10 article + insights README | Published draft with case study |

---

## Decision log

| Question | Proposed decision | Status |
|----------|-------------------|--------|
| Path scoping vs embeddings first? | **Path scoping first** — deterministic, addresses Insight 001 noise directly | **Decided** |
| TF-IDF default vs MiniLM recommended? | TF-IDF = zero-dep default; **MiniLM = recommended** in init for monorepos | **Decided** |
| `MOTUS_ACTIVE_SPEC` vs `ROOTROUTER_ACTIVE_SPEC`? | **`ROOTROUTER_ACTIVE_SPEC` canonical**; document Motus alias | **Decided** |
| Always-on RootRouter? | **No** — phase-gated per Insight 001/002 | **Decided** |
| Cursor proxy? | Document MCP-only for IDE; full stack for Codex/SDK | Proposed |
| `stats` in-loop UX? | **No** — handoff/audit only | **Decided** |
| Replace reading spec? | **Never** — complement only | **Decided** |

---

## Metrics (how we know insights shipped)

| Metric | Baseline (Insight 001) | Target after Phase 6–7 |
|--------|------------------------|-------------------------|
| Token savings vs baseline (cold slice) | ~94% | Maintain ≥90% |
| Noise rate (unrelated modules in top-10 chunks) | Observed (WaaP/PSM) | <1 unrelated module in fixture tests |
| MCP usage on cold slice (with rules) | Required by handoff only | >80% when `ACTIVE_SPEC` set |
| MCP usage on warm single-file fix | Correctly skipped | Remains skipped (don't regress) |
| Time to first useful context | Manual grep/@ folder | <30s via `select_for_spec` |

---

## Insight → phase map

| Insight finding | Phase |
|-----------------|-------|
| 94% savings on cold slice | Validated — protect |
| Noise in selection | Phase 6 |
| Query quality / garbage in | Phase 5.2, Phase 7 |
| Rules beat tool discovery | Phase 5 |
| Skip on warm follow-ups | Document only — don't fight |
| MCP + proxy full stack | Phase 5.3 docs, Phase 8, Phase 9.3 |
| `stats` = handoff not in-loop | Phase 5.2, Phase 8 |
| Spec-first killer workflow | Phase 7 |
| Agent behavior article | Phase 10 |
| Good vs bad behavior patterns | Phase 5 rules, Phase 10 |

---

## Changelog

| Date | Action |
|------|--------|
| 2026-06-27 | Initial roadmap synthesized from Insights 001–003 + NEXT.md carryover |