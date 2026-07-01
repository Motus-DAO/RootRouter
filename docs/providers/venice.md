# Venice + RootRouter

Venice is the **inference wire** (OpenAI-compatible, many models, one API key). RootRouter is the **routing brain** (context trim + difficulty tier + swarm memory).

## Two axes of routing

| Axis | Question | Signal | Output |
|------|----------|--------|--------|
| **Difficulty** | How hard is this task for this agent history? | Weyl chambers, root norm percentiles | `fast` / `balanced` / `powerful` |
| **Capability** | What kind of task is it? | Auto: `detectCapabilities(messages)` | Specialty model from catalog graph |

## SDK quick start

```env
LLM_BASE_URL=https://api.venice.ai/api/v1
LLM_API_KEY=vapi_...
MODEL_CATALOG=venice
VENICE_PRIVACY=private
```

Optional per-tier overrides (win over catalog for that tier only):

```env
MODEL_FAST=qwen3-4b
```

With `MODEL_CATALOG=venice`, `RootRouter.chat()` runs:

1. `ModelRouter` → tier from chambers
2. `detectCapabilities(messages)` → vision / code / reasoning / long-context
3. `resolveModelForRouting()` → Venice model ID from graph

## Catalog API

```typescript
import { resolveVeniceModel, detectCapabilities } from 'rootrouter';

const caps = detectCapabilities(messages, contextTokensBefore);
const model = resolveVeniceModel({
  tier: 'balanced',
  capabilities: caps,
  privacy: 'private',
});
```

Catalog: [`packages/sdk/src/models/veniceCatalog.ts`](../../packages/sdk/src/models/veniceCatalog.ts). Refresh IDs from `GET https://api.venice.ai/api/v1/models`.

## Proxy

Context trim and **lightweight model routing** (`ROOTROUTER_MODEL_ROUTING=true`). See [`packages/proxy/README.md`](../../packages/proxy/README.md).

```bash
ROOTROUTER_MODEL_ROUTING=true MODEL_CATALOG=venice ROOTROUTER_UPSTREAM_ORIGIN=https://api.venice.ai npm run proxy:start
```

Do **not** stack SDK + proxy on the same call (double context trim).

## Tiers vs catalog graph

**3 tiers** (`fast`, `balanced`, `powerful`) for telemetry and Celo. The catalog graph maps tier + capability → concrete Venice model ID among 100+ available models.
