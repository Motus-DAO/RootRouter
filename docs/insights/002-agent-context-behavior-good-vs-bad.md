# Insight 002 — Agent context behavior: good vs bad vs handoff-enforced

**Captured:** 2026-06-27  
**Source:** Internal mental-model session + [Insight 001](./001-cursor-agent-slice-workflow-feedback.md)  
**Status:** Article draft seed — pending editorial pass  
**Related:** RootRouter MCP, proxy, spec-driven slice workflows

---

## Summary

Coding agents don't fail mainly because the model is weak. They fail because **context is mismanaged** — too much loaded, too little loaded, or loaded at the wrong time. This doc contrasts **good agent behavior** (selective, phase-aware context) with **bad/lazy behavior** (prompt stuffing) and **handoff-enforced behavior** (workflow rules that mandate tools like RootRouter). Use it as raw material for an article on engineering better agents.

---

## The premise: context is the real budget

Every LLM call in a chat agent resends what's already in the window:

```
┌─────────────────────────────────────────────────────────┐
│  ONE CHAT = ONE ISOLATED AGENT SESSION                  │
│                                                         │
│  Fixed overhead (every call):                           │
│    system prompt + tool defs + rules + skills + MCP     │
│                                                         │
│  Growing payload:                                       │
│    conversation (history + file reads + tool outputs)   │
│                                                         │
│  Agent chooses WHAT TO ADD each turn                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              LLM receives the full window again
```

Key facts:

1. **Chats are isolated.** Another chat is another agent with its own history unless you explicitly bridge them.
2. **Agents don't send the whole repo every turn by default.** They send whatever landed in the conversation — which can *become* the whole repo if they read or `@`-attach it.
3. **Two stuffing modes exist:**
   - **Active stuffing** — agent (or user) loads too much repo context in one go
   - **Passive stuffing** — conversation grows across turns; prior reads get resent forever until compaction

Token cost and quality both degrade when context is treated as unlimited.

---

## Three behavior modes

| Mode | Who drives it | Intent | Typical outcome |
|------|---------------|--------|-----------------|
| **Good** | Agent heuristics + skill | Minimize context, maximize relevance | Lower cost, faster, fewer hallucinations |
| **Bad / lazy** | Default agent drift or user `@` habits | "More context = safer" | Bloated prompts, noise, slow turns |
| **Handoff-enforced** | Rules, specs, slice templates | Repeatable multi-agent workflow | Consistent kickoffs; may over-use tools if misapplied |

Good and handoff-enforced often look similar on **cold start**. They diverge on **warm follow-ups** — good agents skip re-mining; misconfigured handoffs force redundant selection.

---

## Good agent behavior

Good agents treat context like a cache with an eviction policy: **load narrow, reuse warm, expand only on gap.**

### Phase-aware context strategy

| Phase | Situation | Good behavior |
|-------|-----------|---------------|
| **Cold start** | New slice, unfamiliar repo, "where does X live?" | Index once; select or search with a tight query anchored to spec/AC; read spec + anchor files first |
| **Warm session** | Files already read; localized fix | Edit directly; `Read` only changed files; skip re-indexing and re-selection |
| **Gap fill** | Selection missed an edge | Targeted `Grep` / single-file `Read` — not another full-repo pass |
| **Long session** | Conversation bucket growing | Prefer new chat for unrelated work; avoid re-reading large files already in thread |

### Concrete patterns

**1. Spec-first, repo-second**

```
Read active spec → note acceptance criteria + named anchor files
→ select_context(query = AC + module names, tokenBudget = tight)
→ Read anchor files the spec names (don't skip these)
→ Grep/Read only for gaps selection missed
```

RootRouter complements the spec; it does not replace reading it.

**2. Query discipline**

Good queries are task-shaped, not vague:

- ✅ `"Academy slice 4: lesson player progress bar, PublicCourseDetail cache invalidation, acceptance criteria 3.2"`
- ❌ `"Academy stuff"` or `"read everything about the app"`

**3. Tool choice by cost**

| Need | Good tool | Why |
|------|-----------|-----|
| Known file path | `Read` one file | Cheapest when path is known |
| Symbol / string hunt | `Grep` | Narrow, deterministic |
| Cross-module discovery (cold) | `select_context` | Budgeted relevance vs broad exploration |
| Whole folder "just in case" | **Avoid** `@folder` | Active stuffing |

**4. Warm-path frugality**

When the agent already knows `LessonPlayer`, `PublicCourseDetail`, and the API route:

- Do **not** call `index_repo` again
- Do **not** call `select_context` again
- Use conversation memory + surgical reads

This is correct behavior, not "ignoring RootRouter."

**5. Session hygiene**

- One chat per slice or coherent task
- Don't carry unrelated modules in the same thread
- Start fresh when pivoting to a different product area

---

## Bad / lazy agent behavior

Bad behavior isn't always malice — it's default drift toward **"more context feels safer."**

### Active stuffing (loading too much)

| Pattern | What happens | Cost |
|---------|--------------|------|
| `@`-mention whole folders | Entire directories enter conversation | High tokens upfront; resent every turn |
| Read everything grep returns | 20 files because query was broad | Conversation bloat |
| Skip spec, explore randomly | Semantic search spirals | Time + tokens + wrong files |
| Vague `select_context` query | Noisy chunks (unrelated modules) | Budget wasted on noise |
| Re-index every turn | Redundant `index_repo` calls | Latency + store churn |

### Passive stuffing (never evicting)

| Pattern | What happens | Cost |
|---------|--------------|------|
| Marathon single chat | 50+ turns on unrelated fixes | Conversation bucket dominates (15K→80K+) |
| Re-read files already in thread | Duplicate content in history | Double payment |
| Dump full tool output | Large JSON/logs inline | Poisons subsequent turns |

### Lazy heuristics (looks productive, isn't)

- "I'll grep the whole repo for `handleSubmit`" instead of checking spec anchor paths
- "Let me read `page.tsx` in every app" instead of one `select_context` on cold start
- Calling MCP tools because they exist, not because the task needs them
- Treating RootRouter as autopilot — inject chunks, never verify against spec

### Symptoms you can measure

- Context usage wheel > 50% on routine edits
- Conversation bucket >> tool definitions
- Same files read limit-read across turns
- Agent cites code from wrong product area (noise symptom from Insight 001)

---

## Handoff-enforced behavior

Handoff-enforced behavior is **good behavior made mandatory** for multi-agent or multi-slice workflows. It exists because optional tools lose to agent heuristics.

### When enforcement helps

- New agent picks up a slice cold
- Large monorepo with many product areas
- Spec-driven acceptance criteria must be traceable
- Prior agent's chat is not available

### Typical enforced pipeline

```
MOTUS_ACTIVE_SPEC set (or equivalent)
  → index_repo (once per repo revision)
  → select_context(query from spec AC, tokenBudget = 4000)
  → Read spec + anchor files
  → Implement
  → stats (for handoff doc / audit)
```

Insight 001: this pattern produced **~94% token savings vs stuffing the full indexed baseline** on slice 4/5.

### When enforcement hurts

Forcing the full pipeline on:

- Single-file typo fix
- Progress bar tweak when `LessonPlayer` is already in conversation
- Debug session on one API route

…adds latency and duplicate context without savings.

### The rule that reconciles good + enforced

> **Always `index_repo` + `select_context` when `ACTIVE_SPEC` is set and the agent is cold on the slice. Skip for single-file fixes and warm follow-ups.**

Enforcement should be **phase-gated**, not always-on.

---

## Cold vs warm: the decision that matters most

```
                    COLD                          WARM
                      │                             │
         Unfamiliar repo / new slice      Files already in conversation
         "Where does X live?"             Localized edit / debug
                      │                             │
                      ▼                             ▼
         index_repo (if not warm store)     Direct Read / edit
         select_context (tight query)       Skip re-selection
         Read spec + anchors                Grep only if gap
                      │                             │
                      └──────── both ────────────────┘
                              │
                    Every turn: resend window
                    Long chats: passive stuffing risk
```

**RootRouter's highest ROI is cold path.** Warm path savings come from *not adding more*, not from selecting again.

---

## Engineering better agents: levers

These are the knobs teams can turn — the article's "how to engineer" section.

### 1. Cursor rules (behavior contract)

Encode phase-aware rules:

- When `ACTIVE_SPEC` is set → mandatory kickoff pipeline
- When editing a named file from user → skip index/selection
- Always read spec before `select_context`
- Never `@` entire `apps/` or `packages/` without path scope

Rules turn optional good behavior into default behavior.

### 2. Specs as context anchors

Specs reduce exploration entropy:

- Acceptance criteria → `select_context` query
- Named files → direct `Read` (don't rely on selection alone)
- Out-of-scope modules → `excludePaths` (future RootRouter feature)

### 3. Tool surface area

Small, sharp tool sets beat magic:

- `index_repo`, `select_context`, `stats` — enough for slice kickoff
- Extra tools increase fixed MCP overhead (~881 tokens in a typical Cursor session)

### 4. Proxy vs MCP (two layers)

| Layer | Mechanism | Fixes |
|-------|-----------|-------|
| **MCP** | Agent calls `select_context` | Active stuffing at load time |
| **Proxy** | Trims `messages[]` on every request | Passive stuffing in long chats |

Best stack: **rules + MCP for cold start, proxy for long-session trim** (aligns with `docs/NEXT.md`).

### 5. Handoff documents

Include in slice handoff:

- Spec path
- Query used for `select_context`
- Anchor files read
- `stats` output (tokens saved, store size)
- Known gaps / noise to ignore

Next agent starts warm on *intent*, not on re-exploration.

### 6. Session design (human side)

- One chat per slice
- Paste handoff block at top of new chat
- Don't `@`-folder the repo in the first message

---

## Comparison table (article-ready)

| Dimension | Good agent | Bad / lazy | Handoff-enforced (well scoped) | Handoff-enforced (misapplied) |
|-----------|------------|------------|-------------------------------|------------------------------|
| Cold start | Spec → select → anchors | Random grep / @ folder | Required index + select | Same pipeline on every task |
| Warm follow-up | Direct edit | Re-explore repo | Skip pipeline ✅ | Force pipeline again ❌ |
| Query quality | AC-shaped | Vague | From spec template | Generic template |
| Token trend | Flat / slow growth | Rapid climb | Low on kickoff | U-shaped (kickoff + bloat) |
| RootRouter use | When needed | Never or always | Slice kickoff | Every message |
| Spec | Read first | Skipped | Read first | Assumed by chunks |

---

## Anti-patterns → fixes (cheat sheet)

| Anti-pattern | Fix |
|--------------|-----|
| `@apps/` on every task | Rule: scope `@` to file or spec anchor |
| 80K conversation on small fix | New chat; proxy trim; don't re-read |
| Noisy `select_context` results | Tighter query; path prefix; better embeddings |
| Agent skips RootRouter on cold slice | `ACTIVE_SPEC` rule |
| Agent uses RootRouter on one-line fix | "Skip for single-file fixes" rule |
| Multi-agent context loss | Handoff doc with spec + query + stats |
| "More tools = smarter agent" | Minimize MCP surface; enforce usage rules |

---

## Article outline (for publication)

Use this structure when drafting the public article.

### Working title options

- *Engineering Agent Context: Good Behavior vs Prompt Stuffing*
- *Cold Start, Warm Session: How to Stop Paying for Repo Context Twice*
- *The Context Budget: Designing Agents That Select Instead of Stuff*

### Proposed sections

1. **Hook** — Context wheel screenshot; 30K of 200K isn't free, it compounds
2. **One chat = one agent** — isolation model; why chats don't share memory
3. **What gets sent every turn** — fixed overhead vs conversation bucket
4. **Two kinds of stuffing** — active (load) vs passive (history)
5. **Good behavior** — phase-aware strategy; spec-first; warm-path frugality
6. **Bad behavior** — `@` folders, vague queries, marathon chats
7. **Enforced behavior** — when rules beat heuristics; phase-gated handoffs
8. **Case study** — Insight 001 slice workflow; 94% savings on cold path
9. **Tooling** — RootRouter MCP (select at load) + proxy (trim at send)
10. **Playbook** — rules, specs, handoff template, session design
11. **Checklist** — "Is my agent cold or warm?" decision tree
12. **Close** — Context engineering > model swapping for cost and quality

### Key quotes to preserve

> RootRouter for slice kickoff + unknown territory; direct reads for targeted fixes once oriented.

> RootRouter complements the spec; it does not replace reading it.

> Enforcement should be phase-gated, not always-on.

---

## Decision tree (agent or rule author)

```
New task arrives
│
├─ Is ACTIVE_SPEC / slice handoff set?
│   ├─ YES → Is this chat already warm on anchor files?
│   │   ├─ NO  → index_repo (if needed) → select_context → read spec + anchors
│   │   └─ YES → Skip selection; implement
│   └─ NO  → Is the change single-file / localized?
│       ├─ YES → Read that file; implement
│       └─ NO  → Is repo area unfamiliar?
│           ├─ YES → select_context or targeted search
│           └─ NO  → Read known paths; implement
│
└─ Conversation > 50% full on small task?
    └─ YES → New chat + handoff summary (or rely on proxy trim)
```

---

## Open questions

1. Should the public article lead with Cursor-specific UX or stay tool-agnostic?
2. Include proxy setup in the same article or a follow-up?
3. Publish as MotusDAO / RootRouter devrel or standalone "agent engineering" piece?
4. Add a minimal handoff markdown template as an appendix?

---

## Changelog

| Date | Action |
|------|--------|
| 2026-06-27 | Initial draft from mental-model session + Insight 001 synthesis |
