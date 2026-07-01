# Insight 005 — Business model, routing stack, licensing & Motus agent economy

**Captured:** 2026-06-27  
**Status:** Strategic — grant-ready narrative + product/licensing decisions  
**Sources:** [003](./003-how-rootrouter-works-problem-and-fix.md) · [004](./004-insights-driven-roadmap.md) · Motus stack ([RootAgent](https://github.com/Motus-DAO/RootAgent), [Prism Protocol](https://github.com/Motus-DAO/prism-protocol))  
**Related:** [`COMMERCIAL.md`](../../COMMERCIAL.md)

---

## Summary

RootRouter is **context and swarm middleware**, not an LLM host. **Model routing in RootRouter ≠ model routing in OpenRouter** — they operate on different signals and can stack without redundancy if configured correctly. **Telemetry + metering + tenant isolation are core to the paid business**, not optional. The commercial product is a **hosted, x402-gated proxy** (plus optional hosted MCP), not npm downloads. MIT self-host is a **distribution funnel**, not the revenue engine — licensing strategy must be chosen explicitly so grant narratives and go-to-market stay aligned.

---

## Two kinds of "routing" (not a pleonasm)

| | **RootRouter model routing** | **OpenRouter** |
|--|------------------------------|----------------|
| **Question it answers** | "How hard is *this task* for *this agent history*?" | "Which provider/model API do I call?" |
| **Signal** | Weyl chambers, root norm, agent topology | Model ID string, provider availability |
| **Output** | `fast` / `balanced` / `powerful` tier → model name in config | HTTP forward to Anthropic, OpenAI, etc. |
| **Runs where** | Before the HTTP call (SDK) or N/A (proxy-only clients) | At HTTP inference time |
| **Hosts models?** | No | No (aggregator) |

RootRouter `ModelRouter` picks tier from **algebraic structure of past interactions**:

```36:47:packages/sdk/src/core/router.ts
        if (percentile <= 0.33) {
          modelTier = 'fast';
          reasoning = `Chamber ${chamberId} norm ... (easy) → fast model`;
        } else if (percentile <= 0.66) {
          modelTier = 'balanced';
        } else {
          modelTier = 'powerful';
        }
```

OpenRouter is the **wire** — one API key, many model IDs. RootRouter is the **brain** — which tier, how much context, which agent in a swarm.

**Verdict:** Not the same routing. Overlap only if both blindly pick models without configuration — avoid that in docs.

---

## Do you still need OpenRouter?

**You always need an inference endpoint.** RootRouter does not run Llama, Claude, or GPT.

| Option | When to use |
|--------|-------------|
| **OpenRouter** (one key, many models) | Simplest ops; matches default `LLM_BASE_URL` in SDK |
| **Direct keys** (Anthropic + OpenAI + …) | RootRouter config maps tiers to different providers/models |
| **Venice / private inference** (Prism stack) | Privacy-preserving on-chain agents |
| **Local LLM** | Zero API cost; you operate GPU |

OpenRouter value: **one `Authorization` header, many models, failover, unified billing.**  
RootRouter value: **fewer tokens sent + smarter tier pick + swarm memory.**

You can drop OpenRouter and use direct keys — RootRouter still needs *something* at `llmBaseUrl`. OpenRouter is convenience, not architecture.

---

## Stack configurations (avoid double middleware)

### ✅ Recommended paths

| Use case | Stack | Notes |
|----------|-------|-------|
| **SDK swarm (Motus, in-process)** | `RootRouter.chat()` → OpenRouter **or** direct keys | Context filter inside SDK; **no proxy in the middle** |
| **External HTTP agents (Codex, Hermes)** | Client → **hosted proxy (x402)** → OpenRouter | Proxy trims; client may not use SDK at all |
| **Cursor slice work** | MCP only | No proxy unless client supports `base_url` |
| **Paid product (Model 2)** | x402 → proxy → customer's upstream key | You sell trim/recall/index; they pay inference |

### ⚠️ Pleonasm / waste (warn in docs)

```
SDK RootRouter.chat() → your proxy → OpenRouter
```

- SDK **already** runs `ContextFilter` before `executeLLM`
- Proxy **again** trims `messages[]` on the same payload
- **Cost:** extra latency, double selection CPU, confused metrics
- **Use only if:** you explicitly want cross-session HTTP store recall for an SDK app that speaks HTTP externally — rare

**Rule:** One context-trimming layer per call path.

---

## Model 1 vs Model 2 (reconfirmed)

| | **Model 1 — MotusDAO / personal** | **Model 2 — Paid service / grant story** |
|--|-----------------------------------|------------------------------------------|
| **Tenants** | Single operator | Many wallets / API keys |
| **Store** | One `store.json` | Per-tenant store on VPS |
| **Telemetry** | Useful for you | **Core — billing, trust, support** |
| **x402** | Optional | **Primary paywall** |
| **Goal** | Ship slices, swarms | Revenue + verifiable agent infra |

> "Dogfooding, not product" applied **only to Model 1.** For grants and commercialization, **telemetry + metering + tenant isolation are mandatory product surfaces.**

---

## Grant-ready narrative (copy/adapt)

### Problem

AI agents resend entire conversation and repository context on every LLM call. Costs scale linearly with session length; multi-agent swarms multiply waste. Model marketplaces optimize *which model* runs, not *what context* is sent. There is no standard **verifiable, metered context layer** for autonomous agents on Celo.

### Solution — RootRouter

RootRouter is middleware that:

1. **Selects** minimal relevant context (RepoGraph + MMR, token budget)
2. **Trims** conversation history transparently (HTTP proxy)
3. **Routes** model tier by task difficulty (Weyl chambers, root-pair geometry)
4. **Coordinates** multi-agent swarms (agent topology graph)
5. **Logs** tokens saved and decision metadata on Celo for audit and reputation

Measured: **~94% context token reduction** on cold slice kickoff vs full-repo baseline (Insight 001).

### Business / sustainability (not charity infra)

- **Open core or limited self-host** drives adoption and demos
- **Hosted proxy + x402** monetizes operational value: trim, recall, indexing, SLA
- Customers retain **their own LLM API keys** (OpenRouter or direct); RootRouter charges for **context intelligence**, not resold inference — clear margin (CPU + storage on VPS)

### Ecosystem fit (Motus agent economy — generalizable beyond Motus)

| Layer | Project | Role |
|-------|---------|------|
| Human onboarding + agent wallets | [RootAgent](https://github.com/Motus-DAO/RootAgent) | `createUser`, `verifyUser`, `createAgent`, escrow |
| Identity + scoped wallets + ENS | [Prism Protocol](https://github.com/Motus-DAO/prism-protocol) | Context wallets, paymaster, ERC-8004, `agent.prism-protocol.eth` |
| Context + swarm intelligence | **RootRouter** | MCP, proxy, SDK, Celo telemetry |
| Inference | OpenRouter / Venice / direct keys | LLM execution (customer or agent paid) |

**Complete loop for any ERC-8004 agent:**

```
Prism scoped wallet     →  spending limits on-chain
RootRouter x402 proxy   →  pay per context trim / index / recall
RootRouter Celo telemetry →  verifiable "saved N tokens" for reputation
OpenRouter (their key)  →  inference billed separately
```

### What grant funds enable

- `tenantId` + per-tenant store isolation
- x402 middleware on hosted proxy
- On-chain metering hooks (tokens saved → telemetry contract)
- Hosted MCP for Cursor-class clients without local ops
- Dashboard for agent operators (selection stats, trust metrics)

---

## Telemetry + metering — product core (Model 2)

| Signal | Use |
|--------|-----|
| `x-rootrouter-tokens-saved` | x402 pricing basis |
| Requests trimmed / passed through | Usage tiers |
| `index_repo` / `select_context` (MCP) | Separate metered tools |
| Per-tenant aggregates | Invoices, support, abuse detection |
| Celo telemetry entries | Public reputation for ERC-8004 agents |
| Dropped-chunk / recall feedback | Quality improvement |

**Grant line:** RootRouter provides **verifiable efficiency proofs** for autonomous agents — rare in agent infra today.

---

## Solopreneur commercial model (default)

```
Customer brings:  Authorization: Bearer <their OpenRouter or provider key>
You provide:      Hosted proxy at proxy.rootrouter.eth (or similar)
You charge:       x402 micropayments per trim / index / recall
Your COGS:        VPS CPU, disk, bandwidth — not their inference tokens
Your margin:      Software + ops
```

**Optional upsells:** hosted MCP, managed tenant store, premium embeddings, SLA.

**Do not default to:** reselling inference (you eat token variance + abuse) unless later as a separate SKU.

---

## Licensing: MIT vs pay-per-call only

### Fear (valid)

> "If MIT self-host is complete, nobody needs my hosted service."

### Reality

Self-hosters pay with **time and ops** (Docker, store, upgrades, tenant security). Many agents will pay for **connect-and-forget** if price is micropayments.

### Strategic options

| Model | Pros | Cons |
|-------|------|------|
| **A. Dual license (recommended)** | MIT/BSL for SDK source; **commercial ToS for hosted** x402 endpoint | Must enforce at network boundary, not license alone |
| **B. Source-available, no free self-host proxy** | Stronger capture | Slower adoption, weaker grant "open research" story |
| **C. Pay-per-call only, no public source** | Maximum control | Harder hackathon/grant narrative; slower ecosystem |
| **D. MIT npm + proprietary hosted only** | Common open-core pattern | Accept some self-host; compete on convenience + telemetry |

### Recommendation (current stage)

1. **Keep repo private** until tenantId + x402 MVP exists (you are here).
2. **Publish selectively:** SDK docs/demos for grants; delay full npm `0.2.0` if needed.
3. **Update `COMMERCIAL.md`:** hosted proxy, x402, managed store, telemetry = **paid**; self-host MIT **optional** or time-delayed (BSL 2-year).
4. **Revenue binds to hosted identity:** wallet-gated proxy URL, not npm install.

> Pay-per-call is the **business model**. MIT is a **distribution choice**, not the business. They can coexist if hosted value (tenant store, x402, Celo receipts, SLA) is clearly superior to DIY.

---

## Multi-tenant architecture (monetization prerequisite)

```
Request headers:
  x-rootrouter-tenant-id: 0xABC...     ← payer (Prism context wallet or API key hash)
  x-rootrouter-agent-id:  planner       ← role within swarm
  Authorization: Bearer sk-or-...       ← their inference key (forwarded)
```

| Approach | Verdict |
|----------|---------|
| One proxy, many tenants | ✅ Standard |
| One store.json for all | ❌ Privacy / billing disaster |
| One store path per tenant | ✅ `/data/tenants/{tenantId}/store.json` |
| One proxy per user | ❌ Ops nightmare |

**Engine work:** scope store by `tenantId` in metadata + filesystem path (Phase in roadmap 004 / new Phase 12).

---

## Cross-machine agents (Codex + Hermes, etc.)

Shared **hosted proxy** helps when:

- Each client supports `base_url` → your VPS
- Same `x-rootrouter-tenant-id` → shared memory across machines
- HTTP conversation trim applies

Does **not** replace Cursor MCP for IDE chat.

---

## Smallest paid surface (MVP checklist)

| # | Ship | Purpose |
|---|------|---------|
| 1 | Docker proxy on VPS + volume | Run service |
| 2 | x402 gate (wallet pays before trim) | Revenue |
| 3 | `tenantId` → separate store paths | Isolation + billing |
| 4 | Log `x-rootrouter-tokens-saved` → JSON + optional Celo | Receipts / grant metrics |
| 5 | Landing: "Point agent here. Pay per trim. Bring your LLM key." | GTM |

**Defer:** hosted MCP, full dashboard, multi-region — until first paying agent.

---

## Monetization stack (agents, not Motus-only)

```
┌─────────────────────────────────────────────────────────────┐
│  ANY ERC-8004 / autonomous agent                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     ▼                      ▼                      ▼
 Prism paymaster      RootRouter x402        OpenRouter key
 (on-chain limits)    (context micropay)     (inference)
     │                      │                      │
     └──────────────────────┼──────────────────────┘
                            ▼
              RootRouter Celo telemetry
              (verifiable tokens saved → reputation)
```

- **Prism:** *how much* an agent can spend on-chain, revocable, human-readable ENS
- **RootRouter x402:** *pay for context service* off-chain HTTP
- **Telemetry:** *prove* efficiency to humans and other agents

This loop applies to **any agent economy**, not only MotusDAO products.

---

## Open decisions

| Question | Lean |
|----------|------|
| Drop OpenRouter from docs defaults? | Keep as default example; document direct-key mapping |
| MIT for 0.2.0 npm? | Delay or BSL until hosted MVP live |
| Resell inference later? | Separate SKU; not v1 |
| Grant emphasizes open source or hosted? | Both: open research + sustainable hosted infra |
| `tenantId` = wallet vs API key hash? | Wallet if Prism/RootAgent; hash for non-Celo clients |

---

## Related insights

| Doc | Focus |
|-----|-------|
| [003](./003-how-rootrouter-works-problem-and-fix.md) | MCP vs proxy, problem/fix |
| [004](./004-insights-driven-roadmap.md) | Phased engineering batches |

---

## Changelog

| Date | Action |
|------|--------|
| 2026-06-27 | Initial capture: routing clarity, licensing, grant narrative, Motus economy loop |
