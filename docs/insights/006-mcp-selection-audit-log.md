# Insight 006 — MCP selection audit log (shipped)

**Captured:** 2026-06-29  
**Status:** Shipped in SDK + MCP  
**Driver:** Real Cursor usage review — cumulative `stats` reset on MCP restart; no per-call history

---

## Problem

- `stats.totalTokensSaved` and `stats.selections` lived only in the MCP process memory.
- `store.json` persisted indexed chunks but not selection counters.
- Evaluating "all MCP usage and results" required scraping Cursor `agent-transcripts` and `agent-tools/` files.

## Solution (shipped)

| Piece | Location |
|-------|----------|
| Append-only audit log | `ROOTROUTER_SELECTIONS_LOG_PATH` → default `<store-dir>/selections.jsonl` |
| Persisted engine counters | `store.json` → `engineStats: { totalSelections, totalTokensSaved }` |
| MCP tool | `list_selections` — `limit`, `agentId`, `since` |
| CLI | `rootrouter audit` / `npm run audit:mcp` |
| Enhanced `stats` | Last selection query + audit path/summary |

Every successful `select_context` (≥1 item selected) appends one JSON line and syncs counters before `engine.save()`.

## Audit entry shape

```json
{
  "ts": 1719667200000,
  "id": "uuid",
  "query": "Academy slice 4 lesson player …",
  "agentId": "motusdao-hub",
  "tokenBudget": 4000,
  "tokensIn": 134000,
  "tokensOut": 5998,
  "tokensSaved": 128134,
  "percentSaved": 95.5,
  "selectedCount": 24,
  "selectedIds": ["…"],
  "topRelevance": 0.439
}
```

## How to review usage

```bash
npm run audit:mcp
npx rootrouter@beta audit --limit 50 --json
```

In Cursor: MCP `list_selections` or `stats` at slice handoff.

## Roadmap

Tracked under [Phase 8](./004-insights-driven-roadmap.md#phase-8--observability--handoff-audit) (partially complete). Remaining: handoff template doc, `rootrouter doctor`, dashboard labels.

## Legacy sessions

Pre-ship MCP calls are **not** backfilled. Use transcript scraping for historical review only.
