# OpenRouter + RootRouter

OpenRouter is the default **inference wire** in RootRouter demos — one API key, many provider/model IDs.

## SDK quick start

Default behavior (`MODEL_CATALOG=off`) uses `MODEL_FAST` / `MODEL_BALANCED` / `MODEL_POWERFUL` from `.env` directly.

Enable catalog graph routing:

```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-...
MODEL_CATALOG=openrouter
# or MODEL_CATALOG=auto   # infers openrouter from LLM_BASE_URL
```

Optional per-tier overrides:

```env
MODEL_FAST=openai/gpt-4o-mini
```

## Catalog graph

Curated models in [`packages/sdk/src/models/openRouterCatalog.ts`](../../packages/sdk/src/models/openRouterCatalog.ts):

| Tier | Anchor | Specialties |
|------|--------|-------------|
| fast | `anthropic/claude-haiku-4.5` | — |
| balanced | `anthropic/claude-sonnet-4.5` | vision → `openai/gpt-4o`, code → `x-ai/grok-3-mini` |
| powerful | `anthropic/claude-opus-4.6` | reasoning → `openai/o3-mini`, long-context → `google/gemini-2.5-pro-preview` |

## API

```typescript
import { resolveOpenRouterModel, detectCapabilities } from 'rootrouter';

const caps = detectCapabilities(messages);
const model = resolveOpenRouterModel({ tier: 'balanced', capabilities: caps });
```

## Mixing providers via tiers

Example: fast tier on Grok, powerful on Claude Opus — set overrides:

```env
MODEL_CATALOG=openrouter
MODEL_FAST=x-ai/grok-3-mini
MODEL_POWERFUL=anthropic/claude-opus-4.6
```

Only tiers with explicit `MODEL_*` env vars use overrides; others resolve via the graph.

## Proxy

```bash
npm run proxy:start   # upstream defaults to openrouter.ai
```

Model routing in proxy: `ROOTROUTER_MODEL_ROUTING=true` + `MODEL_CATALOG=openrouter`. See [`packages/proxy/README.md`](../../packages/proxy/README.md).
