# Insight 003 — How RootRouter works: problem, architecture, and fix

**Captured:** 2026-06-27  
**Source:** Mental-model sessions + [Insight 001](./001-cursor-agent-slice-workflow-feedback.md) + [Insight 002](./002-agent-context-behavior-good-vs-bad.md)  
**Status:** Product explainer — pending editorial pass  
**Related:** `@rootrouter/mcp`, `@rootrouter/proxy`, `rootrouter` SDK

---

## Summary

Coding agents pay for **context** on every LLM call — not just the latest message. RootRouter is middleware that **selects** the minimal relevant slice of context instead of sending everything. It operates at two layers: **MCP** (agent-driven repo selection at load time) and **proxy** (automatic conversation trimming at send time). Together they address both **active** and **passive** prompt stuffing. This doc explains the problem, the fix, and how the pieces fit.

---

## The problem: agents resend too much context

### How a chat agent actually works

Each Cursor chat is an **isolated agent session**. Every turn, the LLM receives:

```
┌─────────────────────────────────────────────────────────┐
│  FIXED OVERHEAD (every call)                            │
│    system prompt · tool definitions · rules · skills    │
│    MCP metadata · subagent defs                         │
│                                                         │
│  GROWING PAYLOAD                                        │
│    conversation = chat history + file reads + tool out  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              Full window resent to the LLM
```

Important clarifications:

1. **Agents don't send the whole repo every turn by default** — they send whatever landed in the conversation.
2. **But that still becomes "prompt stuffing"** if the agent (or user) loaded too much, or if the chat ran long enough that history dominates the window.
3. **Chats don't share memory** — another chat is a different agent unless you explicitly bridge them.

Token cost and answer quality both degrade when context is treated as unlimited.

### Two modes of stuffing

| Mode | What happens | Typical cause |
|------|--------------|---------------|
| **Active stuffing** | Too much repo context loaded in one go | `@` whole folders, broad greps, reading 20 files, no selection |
| **Passive stuffing** | Conversation grows; prior reads resent forever | Long chats, repeated tool output, no compaction |

Most "context optimization" conversations focus on one mode. Real sessions hit **both**.

### What existing tools don't solve

| Tool | Gap |
|------|-----|
| **Model routers** (OpenRouter, etc.) | Pick *which model* — not *what context* to send |
| **Agent frameworks** | Orchestrate tasks — don't budget repo context |
| **Raw MCP / Read / Grep** | Agent must self-regulate; defaults drift toward "more = safer" |

RootRouter targets the **context payload** itself.

---

## The fix: select, don't stuff

RootRouter's core job:

> **Given a query and a token budget, return the minimal relevant context — not everything.**

Selection uses:

- **Query-aware similarity** — cosine similarity between query embedding and candidate chunks
- **Maximal Marginal Relevance (MMR)** — relevance vs redundancy trade-off (`mmrLambda`, default 0.7)
- **RepoGraph** (for indexed codebases) — import edges, directory communities, hub boosting
- **Optional chamber boosting** — algebraic regions from root-pair telemetry when enabled
- **Token budget enforcement** — hard cap on selected output (default 4000 tokens)

The engine **never calls an LLM** for selection. The agent (or proxy) stays in control of the model call.

Measured result from a real agent session (Insight 001): **~61–63k tokens saved (~94%)** vs stuffing the full indexed baseline on slice kickoff queries.

---

## RootRouter's two layers

RootRouter ships as one SDK with **two deployment surfaces** that fix different parts of the problem:

```
                    THE CONTEXT PROBLEM
                           │
           ┌───────────────┴───────────────┐
           │                               │
    ACTIVE STUFFING                 PASSIVE STUFFING
    (loading too much repo)         (history resend)
           │                               │
           ▼                               ▼
    ┌─────────────┐                 ┌─────────────┐
    │  MCP server │                 │    Proxy    │
    │  (explicit) │                 │ (automatic) │
    └─────────────┘                 └─────────────┘
           │                               │
    index_repo                      trim messages[]
    select_context                  on every request
    record_context                  recall from store
    stats                           cross-session memory
```

### Design decision (from roadmap)

> **Proxy primary** for zero-friction savings; **MCP for explicit control + `index_repo`.**

They are complementary, not either/or.

---

## Layer 1 — MCP (`@rootrouter/mcp`)

**Who drives it:** The agent (via tool calls).  
**When it runs:** When the agent chooses to call it — ideally on cold start / large slices.  
**What it fixes:** Active stuffing at **repo load time**.

### Tools

| Tool | Purpose |
|------|---------|
| `index_repo` | Walk codebase → chunk files → build RepoGraph → upsert into store |
| `select_context` | Query + token budget → ranked, deduplicated chunks |
| `record_context` | Stash ad-hoc items (tool output, docs, prior turns) |
| `stats` | Store size, selections served, cumulative tokens saved |

### Typical cold-start flow

```
1. index_repo(path)              → store warm with repo chunks
2. Read active spec              → acceptance criteria + anchor files
3. select_context(query, budget) → ~4K relevant chunks (not 60K+ baseline)
4. Read anchor files spec names  → don't skip these
5. Grep/Read only for gaps       → surgical follow-up
```

### What MCP is good at

- **Microscope** — budgeted repo slice for unfamiliar territory
- **Spec-driven slices** — query anchored to acceptance criteria
- **"Where does X live?"** — cross-module discovery in large monorepos
- **Handoff enforcement** — rules can require index + select on slice kickoff

### What MCP is not

- Not autopilot — agent still interprets results and fills gaps
- Not a spec replacement — read the spec and anchor files first
- Not always-on — skip on warm, single-file follow-ups (see Insight 002)
- Not conversation trimmer — selected chunks still enter the chat window

### Setup (Cursor)

```bash
npx rootrouter@beta init cursor   # writes .cursor/mcp.json
npx rootrouter@beta index ./repo  # optional CLI index
```

Local monorepo config uses `ROOTROUTER_STORE_PATH` pointing at `.rootrouter/store.json`.

---

## Layer 2 — Proxy (`@rootrouter/proxy`)

**Who drives it:** Infrastructure — transparent to the agent.  
**When it runs:** Every `POST .../chat/completions` request (when prompt exceeds threshold).  
**What it fixes:** Passive stuffing at **send time**.

### Request path

```
agent  ──POST /v1/chat/completions──►  rootrouter-proxy
                                          │
                          record turns → FileContextStore
                          trim in-request history
                          recall relevant store hits
                                          │
                          ──trimmed request──►  upstream LLM
                                          │
agent  ◄──response (unchanged)────────────
```

### What it keeps vs trims

| Always kept | Trimmed / selected |
|-------------|-------------------|
| System messages | Prior plain-text user/assistant turns |
| Tool/function messages | Least relevant subset within budget |
| Multimodal content | |
| Final user message | |

### Key env knobs

| Variable | Default | Purpose |
|----------|---------|---------|
| `ROOTROUTER_STORE_PATH` | `~/.rootrouter/store.json` | Shared persistent store |
| `ROOTROUTER_CONTEXT_BUDGET` | `4000` | Token budget for selectable prior context |
| `ROOTROUTER_MIN_TOKENS_TO_FILTER` | `6000` | Only trim when prompt is actually large |
| `ROOTROUTER_STORE_SHARE` | `0.5` | Split budget: in-request vs store recall |
| `ROOTROUTER_REPO_PATH` | unset | Auto-index repo on proxy startup |

### Fails open

If trimming fails, the **original request is forwarded unchanged**. The proxy never breaks a call.

### What the proxy is good at

- **Safety net** — long chats where conversation bucket dominates
- **Zero agent changes** — point `base_url` at the proxy
- **Cross-session recall** — relevant past turns from store
- **Passive savings** — no tool calls required

### Proxy response headers (operational visibility)

| Header | Meaning |
|--------|---------|
| `x-rootrouter-tokens-saved` | Tokens removed by trimming for that request |
| `x-rootrouter-store-recalled` | Number of turns injected from persistent store |
| `x-rootrouter-model-selected` | Routed model id (when lightweight routing is enabled) |
| `x-rootrouter-tier` | Routed tier (`fast` / `balanced` / `powerful`) |

### What the proxy is not

- Not repo-aware unless chunks are indexed (`index_repo` or `ROOTROUTER_REPO_PATH`)
- Not a substitute for MCP on cold start — trims history, doesn't replace smart loading
- Not available in Cursor chat by default — requires controlling the LLM client's `base_url`

---

## Shared foundation: one store, one engine

Both MCP and proxy use the same **`FileContextStore`** at `ROOTROUTER_STORE_PATH`:

```
┌─────────────────────────────────────────────────────────┐
│              ROOTROUTER_STORE_PATH                      │
│              (e.g. ~/.rootrouter/store.json)            │
│                                                         │
│   repo chunks ◄── index_repo (MCP / CLI / proxy)      │
│   recorded turns ◄── record_context (MCP) / proxy       │
│   ad-hoc items ◄── record_context (MCP)                 │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   select_context (MCP)          recall on proxy request
```

**Best practice:** point MCP and proxy at the **same store path** so repo index and conversation memory compound.

### RepoGraph (indexing pipeline)

When you `index_repo`:

1. **Walk** — scan repo with ignore rules (`node_modules`, `.git`), max file size
2. **Chunk** — split files (~400 tokens/chunk default)
3. **Graph** — extract import edges, assign directory communities, compute hub degree
4. **Store** — upsert chunks with metadata for graph-aware selection

At selection time, `ContextSelector` applies similarity + MMR + optional graph/community boosts.

---

## The full stack: how both layers work together

```
PHASE 1 — Cold slice kickoff
  MCP:     index_repo → select_context (microscope)
  Agent:   read spec + anchors + selected chunks
  Proxy:   (may pass through if prompt still small)

PHASE 2 — Implementation (warm)
  MCP:     skip re-selection
  Agent:   edit known files directly
  Proxy:   trims if conversation grows

PHASE 3 — Long session
  MCP:     optional gap-fill only
  Proxy:   main value — trim history past 6K+ tokens
  Human:   new chat per slice if needed
```

### One-line mental model

| Layer | Metaphor | Fixes |
|-------|----------|-------|
| **MCP** | Microscope | What to **load** into the chat |
| **Proxy** | Safety net | What to **resend** to the LLM |

---

## Deeper capabilities (SDK beyond context trim)

RootRouter is broader than context selection, but **context budgeting is the primary agent-facing value today**:

| Capability | Purpose |
|------------|---------|
| **Root-pair telemetry** | Intent − execution vectors per interaction |
| **Weyl chambers** | Regions of interaction space → optional selection boost |
| **Interaction graph** | Relational context retrieval across turns |
| **Model tier routing** | Route by chamber difficulty (fast / balanced / powerful) |
| **Celo telemetry** | On-chain stats for agent sessions |
| **Dashboard** | Topology, chambers, savings snapshots |

These layers complement RepoGraph — they don't replace it. See `docs/architecture.md` for the full math.

---

## Deployment matrix

| Client | MCP | Proxy | Recommended stack |
|--------|-----|-------|-------------------|
| **Cursor IDE chat** | ✅ via `.cursor/mcp.json` | ❌ not by default | MCP + rules + session hygiene |
| **Codex CLI** | ✅ via `~/.codex/config.toml` | ✅ via `base_url` | MCP + proxy + shared store |
| **Custom SDK agent** | ✅ optional tools | ✅ `base_url` | Full stack |
| **OpenAI-compatible scripts** | optional | ✅ | Proxy-first |

---

## When to use what

| Situation | MCP | Proxy | Also |
|-----------|-----|-------|------|
| New slice, cold on repo | ✅ index + select | helps later | Read spec first |
| Single-file fix, files in chat | ❌ skip | if chat long | Direct edit |
| "Where does X live?" | ✅ select | — | Tight query |
| 50-turn marathon chat | ❌ | ✅ | Consider new chat |
| Multi-agent handoff | ✅ on kickoff | ✅ ongoing | Handoff doc + stats |
| `@` whole folder habit | ✅ prevents | partial | Cursor rule |

### Phase-gated rule (recommended)

> **Always `index_repo` + `select_context` when `ACTIVE_SPEC` is set and the agent is cold on the slice. Skip for single-file fixes and warm follow-ups.**

---

## What RootRouter does not fix

Be honest about limits:

1. **Fixed Cursor overhead** — system prompt, tool defs, rules, MCP metadata (~15K+) are not trimmed by RootRouter in Cursor.
2. **Tool output in thread** — large file reads stay in conversation until proxy trim or compaction; proxy keeps tool messages.
3. **Bad queries** — vague `select_context` queries produce noisy chunks (Insight 001: WaaP/PSM alongside Academy).
4. **Agent discipline** — without rules, agents may skip MCP on cold start or over-use it on warm fixes.
5. **Cursor proxy gap** — IDE users get MCP layer unless they route API traffic separately.

---

## Configuration quick reference

### MCP (Cursor)

```json
{
  "mcpServers": {
    "rootrouter": {
      "command": "node",
      "args": ["/path/to/packages/mcp/dist/server.js"],
      "env": {
        "ROOTROUTER_STORE_PATH": "/path/to/.rootrouter/store.json"
      }
    }
  }
}
```

### Proxy

```bash
export ROOTROUTER_STORE_PATH=~/.rootrouter/store.json
export ROOTROUTER_REPO_PATH=./my-repo
export ROOTROUTER_CONTEXT_BUDGET=4000
export ROOTROUTER_MIN_TOKENS_TO_FILTER=6000
npx -p @rootrouter/proxy@beta rootrouter-proxy
# agent base_url → http://localhost:8787
```

### Codex full stack (MCP + proxy + shared store)

```bash
npx rootrouter@beta init codex --local-embeddings
export ROOTROUTER_STORE_PATH="$HOME/.rootrouter/store.json"
export ROOTROUTER_REPO_PATH="$PWD"
npx -p @rootrouter/proxy@beta rootrouter-proxy
```

### Embeddings (quality upgrade)

Default is local TF-IDF (no network). For better cross-module semantic matching:

```bash
EMBEDDING_PROVIDER=local          # or api with EMBEDDING_API_KEY
EMBEDDING_LOCAL_MODEL=minilm
ROOTROUTER_USE_CHAMBERS=true      # optional chamber boost
```

---

## End-to-end example: slice workflow

**Context:** Agent picks up Academy slice 4 cold on a large monorepo.

```
1. Handoff says: MOTUS_ACTIVE_SPEC=docs/slices/academy-4.md

2. Agent calls index_repo("/repo") 
   → 847 chunks indexed, store warm

3. Agent reads academy-4.md spec
   → AC: progress bar, cache invalidation, criteria 3.2
   → Anchors: LessonPlayer.tsx, PublicCourseDetail.tsx

4. Agent calls select_context(
     query = "Academy slice 4 lesson player progress bar cache invalidation AC 3.2",
     tokenBudget = 4000
   )
   → ~4K tokens selected vs ~65K baseline (~94% saved)

5. Agent reads anchor files + fills gaps with Grep

6. Agent implements; conversation grows over 20 turns

7. (If proxy enabled) Request 15+ trims prior turns automatically
   → x-rootrouter-tokens-saved header reports savings

8. Handoff calls stats() for audit doc
```

---

## Related insights

| Doc | Focus |
|-----|-------|
| [001 — Cursor agent slice feedback](./001-cursor-agent-slice-workflow-feedback.md) | Real agent review, 94% savings, noise gap |
| [002 — Good vs bad agent behavior](./002-agent-context-behavior-good-vs-bad.md) | Phase-aware context, rules, article draft |

---

## Open questions

1. Should `rootrouter init cursor` document the proxy stack even though Cursor can't use it natively?
2. Default local MiniLM in init templates vs TF-IDF for beta?
3. First-class `pathPrefix` on `select_context` to reduce cross-module noise?
4. Unified `rootrouter doctor` command to verify MCP + proxy + store alignment?

---

## Changelog

| Date | Action |
|------|--------|
| 2026-06-27 | Initial product explainer from mental-model sessions |
