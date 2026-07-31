# Benchmark evidence and methodology

RootRouter measures context savings at two different layers:

1. The SDK/proxy path filters accumulated interaction history automatically.
2. The MCP path selects a task-specific slice from an indexed repository.

These results answer different questions. They should not be averaged or presented as one universal savings rate.

## NVIDIA NIM live swarm — 46%

On July 1, 2026, RootRouter ran a 24-step swarm profile through NVIDIA's OpenAI-compatible NIM API using `nvidia/nemotron-3-ultra-550b-a55b`.

| Metric | Result |
|---|---:|
| Agents | 3 (`planner`, `coder`, `researcher`) |
| Steps | 24 |
| Profile | 5 warm-up rounds × 3 agents + 3 complex tasks × 3 agents |
| Estimated accumulated-history context | 134,226 tokens |
| Estimated selected context | 72,450 tokens |
| Estimated context saved | 61,776 tokens |
| Estimated reduction | **46.0239%** |
| API-reported filtered prompt tokens | 116,109 |
| Output tokens | 12,288 |
| Total API latency | 565,035 ms (~9.4 minutes) |

The 46% figure is calculated from RootRouter's aligned context estimates:

```text
(134,226 - 72,450) / 134,226 = 46.0239%
```

It measures filtering over accumulated swarm history. The artifact reports real completions and API token/latency data, but the percentage itself uses RootRouter's context estimator. The run recorded zero valid paired warm-query API comparisons, so it should be called **estimated context savings on a live-API run**, not an API-billed-token reduction.

Reproduce:

```bash
NVIDIA_NIM_API_KEY=... npm run demo:benchmark-live:swarm
```

Evidence: [`benchmarks/results/nim-live-swarm-2026-07-01T22-10-18.json`](../benchmarks/results/nim-live-swarm-2026-07-01T22-10-18.json).

## Cursor MCP cold slice — ~96%

A real Cursor workflow used RootRouter MCP to index a large repository and select context for a cold, spec-driven slice. The persisted audit example records:

| Metric | Result |
|---|---:|
| Baseline | ~134,000 indexed-corpus tokens |
| Selected context | 5,998 tokens |
| Reported reduction | 95.5%, rounded to **~96%** |

This result measures `index_repo` + `select_context` against the full indexed repository corpus. It does not mean Cursor would otherwise send the entire repository on every request.

The workflow review also found:

- MCP was most useful for cold starts, unfamiliar areas, and spec-driven slices.
- Warm, localized follow-ups were better served by direct file reads.
- Some selected chunks were noisy, so context reduction is not proof of equivalent answer quality.
- Earlier slice 4/5 observations were approximately 94%; the ~96% headline comes from the later persisted audit example.

Evidence: [Cursor slice workflow review](insights/001-cursor-agent-slice-workflow-feedback.md) and [MCP selection audit log](insights/006-mcp-selection-audit-log.md).

## Offline SDK benchmark — ~49%

The reproducible offline benchmark uses TF-IDF embeddings and a simulated LLM:

```bash
npx tsx packages/sdk/demo/benchmark.ts --seed 42
```

It is a regression and modeling benchmark, not a live-provider result. Its approximately 49% modeled savings are directionally consistent with the 46% live swarm context estimate.

## Reporting rules

When citing RootRouter results:

1. Name the path: live SDK/proxy history filtering or MCP repository selection.
2. State the baseline.
3. Label estimated, API-reported, audited, and simulated metrics explicitly.
4. Do not generalize the ~96% cold-slice result to every Cursor request.
5. Do not infer answer quality from root norm or token reduction alone.
