# @rootrouter/proxy

A transparent, OpenAI-compatible proxy that trims prompt context with RootRouter before forwarding to your real LLM provider. Point any agent's `base_url` at it and it cuts tokens with **zero code changes** — the agent doesn't even need to know RootRouter exists.

This is the "it just happens" path: unlike the MCP server (where the agent must call tools), the proxy filters every `chat/completions` request automatically.

## How it works

```
agent  --(POST /v1/chat/completions)-->  rootrouter-proxy
                                            |
                            records turns -> FileContextStore (cross-session)
                            trims in-request history + recalls relevant store hits
                                            |
                            --(trimmed request, your API key)-->  upstream LLM
                                            |
        agent  <--(streamed response, unchanged)-----------
```

- **Stateful (default):** every request upserts turns into a file-backed store (`ROOTROUTER_STORE_PATH`). Later requests with short `messages[]` can recall relevant prior turns from earlier sessions.
- Only `POST` requests whose path contains `/chat/completions` are transformed; everything else is proxied verbatim.
- Your API key is passed through untouched (the `Authorization` header is forwarded), so the proxy never needs your credentials.
- Streaming (`stream: true`) responses are piped straight through.
- **Fails open**: if anything goes wrong while trimming, the original request is forwarded unchanged. The proxy never breaks a call.

### What it keeps vs. trims

- Always kept: system messages, tool/function messages, any multimodal (non-string) content, and the final user message.
- **In-request:** prior plain-text `user`/`assistant` turns — most relevant subset kept (MMR + budget).
- **From store:** relevant turns from past requests injected before the final user message (split budget via `ROOTROUTER_STORE_SHARE`, default 50%).

## Install / build

From the monorepo root:

```bash
npm install
npm run proxy:build
npm run proxy:start   # listens on http://localhost:8787
```

## Point your agent at it

The proxy forwards the incoming path to `ROOTROUTER_UPSTREAM_ORIGIN` unchanged — it just swaps the origin. So set your client's `base_url` to the proxy with the same path your provider uses.

### OpenRouter (default upstream)

```bash
# upstream origin defaults to https://openrouter.ai
npm run proxy:start
```

```python
# OpenAI SDK pointed at the proxy
client = OpenAI(base_url="http://localhost:8787/api/v1", api_key=OPENROUTER_KEY)
```

### OpenAI

```bash
ROOTROUTER_UPSTREAM_ORIGIN=https://api.openai.com npm run proxy:start
```

```python
client = OpenAI(base_url="http://localhost:8787/v1", api_key=OPENAI_KEY)
```

### Anthropic-compatible / others

Set `ROOTROUTER_UPSTREAM_ORIGIN` to the provider origin and use the provider's normal path under the proxy host.

### Venice

```bash
ROOTROUTER_UPSTREAM_ORIGIN=https://api.venice.ai npm run proxy:start
```

```python
client = OpenAI(base_url="http://localhost:8787/api/v1", api_key=VENICE_API_KEY)
```

### Venice with model routing

```bash
ROOTROUTER_MODEL_ROUTING=true \
MODEL_CATALOG=venice \
VENICE_PRIVACY=private \
ROOTROUTER_UPSTREAM_ORIGIN=https://api.venice.ai \
npm run proxy:start
```

```python
client = OpenAI(base_url="http://localhost:8787/api/v1", api_key=VENICE_API_KEY)
# model field is rewritten by proxy unless x-rootrouter-force-model: true
```

## Model routing (lightweight)

Opt-in HTTP model routing without chambers or embeddings (~1ms overhead). Reuses SDK `detectCapabilities` and `resolveModelForRouting`.

### Activation

```bash
ROOTROUTER_MODEL_ROUTING=true
MODEL_CATALOG=auto          # or venice | openrouter | off (uses MODEL_* tiers only)
ROOTROUTER_UPSTREAM_ORIGIN=https://api.venice.ai
VENICE_PRIVACY=private      # when using Venice catalog
```

### Tier heuristic

Per `x-rootrouter-agent-id`, in-memory rolling stats only:

| Signal | Tier bias |
|--------|-----------|
| Short query, low token count | `fast` |
| Medium complexity | `balanced` |
| Code/reasoning keywords, high tokens | `powerful` |

Capabilities: `detectCapabilities(messages)` from request body (vision parts, keywords).

Resolver: `resolveModelForRouting(config, { tier, capabilities })` → rewrite `body.model` before upstream forward.

### Response headers

- `x-rootrouter-model-selected` — model ID sent upstream
- `x-rootrouter-tier` — `fast` | `balanced` | `powerful`

### Opt-out per request

- Header `x-rootrouter-force-model: true` → keep client `model` unchanged

### Not included (future: `ROOTROUTER_MODEL_ROUTING=full`)

- `StructuredVectorSpace` / chamber refit (SDK-parity routing, higher latency)
- Do not stack SDK `RootRouter.chat()` and proxy on the same call (double context trim)

Implementation: [`src/lightweightRouter.ts`](src/lightweightRouter.ts), [`src/routingConfig.ts`](src/routingConfig.ts).

## Configuration (env)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8787` | Port the proxy listens on |
| `ROOTROUTER_UPSTREAM_ORIGIN` | `https://openrouter.ai` | Origin to forward to (path is preserved) |
| `ROOTROUTER_MODEL_ROUTING` | `false` | Enable lightweight model tier + catalog routing |
| `MODEL_CATALOG` | `off` | `off` \| `auto` \| `venice` \| `openrouter` (same as SDK) |
| `MODEL_FAST` / `MODEL_BALANCED` / `MODEL_POWERFUL` | SDK defaults | Per-tier override when catalog active; sole source when `off` |
| `VENICE_PRIVACY` | `private` | Venice catalog privacy preference |
| `ROOTROUTER_STORE_PATH` | `~/.rootrouter/store.json` | Persistent cross-session context store |
| `ROOTROUTER_STORE_SHARE` | `0.5` | Fraction of `contextBudget` for store recall vs in-request |
| `ROOTROUTER_MAX_ITEMS` | unbounded | Cap stored items (oldest evicted) |
| `ROOTROUTER_CONTEXT_BUDGET` | `4000` | Token budget for the selectable prior-turn context |
| `ROOTROUTER_MIN_TOKENS_TO_FILTER` | `6000` | Only trim when the prompt exceeds this many tokens |
| `ROOTROUTER_MMR_LAMBDA` | `0.7` | Relevance vs diversity trade-off |
| `EMBEDDING_API_KEY` | unset | Use real embeddings instead of local TF-IDF |
| `EMBEDDING_PROVIDER` | `tfidf` (or `api` when key set) | `tfidf`, `api`, or `local` (ONNX via `@xenova/transformers`) |
| `EMBEDDING_LOCAL_MODEL` | `minilm` | `minilm` or `bge-small` when `EMBEDDING_PROVIDER=local` |
| `ROOTROUTER_BASELINE_WINDOW` | `20` | Window size for realistic savings baseline |
| `ROOTROUTER_REPO_PATH` | unset | Auto-index this repo into the store on proxy startup |

## Per-request overrides (headers)

| Header | Effect |
|--------|--------|
| `x-rootrouter-disable: true` | Skip trimming for this request |
| `x-rootrouter-budget: <n>` | Override the context token budget for this request |
| `x-rootrouter-agent-id: <id>` | Scope store recall/recording per agent (default `default`) |
| `x-rootrouter-recall-feedback: down` | Thumbs-down hook: log dropped turns as bad recall signal |
| `x-rootrouter-force-model: true` | Skip model routing rewrite for this request |

## Response headers

| Header | Meaning |
|--------|---------|
| `x-rootrouter-tokens-saved` | Tokens removed from the prompt for this request |
| `x-rootrouter-store-recalled` | Turns injected from the persistent store |
| `x-rootrouter-model-selected` | Model ID chosen by routing (when `ROOTROUTER_MODEL_ROUTING=true`) |
| `x-rootrouter-tier` | Tier chosen: `fast`, `balanced`, or `powerful` |

Quick check:

```bash
curl -i http://localhost:8787/healthz
# then inspect x-rootrouter-tokens-saved / x-rootrouter-store-recalled on chat responses
```

Codex full-stack one-liner (shared MCP + proxy store):

```bash
npx rootrouter@beta init codex --local-embeddings && \
ROOTROUTER_STORE_PATH="$HOME/.rootrouter/store.json" \
ROOTROUTER_REPO_PATH="$(pwd)" \
npx -p @rootrouter/proxy@beta rootrouter-proxy
```

## Health check

```bash
curl http://localhost:8787/healthz
# {"ok":true,"upstream":"https://openrouter.ai","contextBudget":4000}
```

## Context meter

Process-local context health (resets on proxy restart):

```bash
curl http://localhost:8787/context
# or /v1/context
```

Returns last request (`tokensBefore` / `tokensAfter` / `tokensSaved` / `budgetFill`), session totals, and per-`agentId` rollup. This is a **managed-context** gauge (trim delta + budget fill), not just provider burn.

## Caveats

- Trimming is **stateful** by default: turns are recorded in `ROOTROUTER_STORE_PATH` and recalled across requests. Prior in-request turns are also filtered within the token budget.
- For explicit control (record/select without a proxy), use `@rootrouter/mcp` instead.
- Local TF-IDF relevance is keyword-oriented. For semantically harder cases, set `EMBEDDING_API_KEY` to use real embeddings.
- The default `minTokensToFilter` (6000) means small prompts pass through untouched — trimming only kicks in once a prompt is actually large.

┌─────────────────────────────────────────────────────────────┐
│  APPLICATION LAYER (you build this)                         │
│    MotusDAO swarm · your backend agents · solopreneur bots  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐
│  RootRouter  │    │ @rootrouter/ │    │  @rootrouter/mcp     │
│  class       │    │ proxy        │    │  (stdio tools)       │
│  (swarm.ts)  │    │ (HTTP)       │    │                      │
└──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘
       │                   │                         │
       └───────────────────┴─────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  rootrouter SDK (npm)  │  ← THE ENGINE
              │  ContextEngine         │
              │  selectContext + MMR   │
              │  RepoGraph / indexRepo │
              │  RootPair + chambers   │
              │  AgentTopologyGraph    │
              │  ModelRouter           │
              │  Celo telemetry        │
              └────────────────────────┘