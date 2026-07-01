/**
 * Landing page evidence — synced from benchmarks/results/nim-latest.json after live runs.
 * Run: npm run demo:benchmark-live -- --queries 12
 */

export type EvidenceMethod = 'audited' | 'production' | 'simulated' | 'live-api';

export interface EvidenceMetric {
  id: string;
  path: string;
  value: string;
  label: string;
  detail: string;
  method: EvidenceMethod;
  footnote?: string;
}

export const evidenceMetrics: EvidenceMetric[] = [
  {
    id: 'mcp-cold-slice',
    path: 'Cursor MCP · cold slice',
    value: '~95%',
    label: 'context tokens saved',
    detail: 'Audited slice kickoffs vs full-repo baseline (index_repo + select_context)',
    method: 'audited',
    footnote: 'Warm follow-ups should skip MCP. See insight 001 & selections.jsonl audit.',
  },
  {
    id: 'nim-live-api',
    path: 'NVIDIA NIM · live API',
    value: '1.6%',
    label: 'chat context saved (12-turn)',
    detail:
      'Real completions — nvidia/nemotron-3-ultra-550b-a55b, 12 multi-turn queries, integrate.api.nvidia.com (2026-07-01)',
    method: 'live-api',
    footnote:
      'Measures chat-history filtering, not repo MCP. Savings grow as sessions lengthen. Reproduce: npm run demo:benchmark-live',
  },
  {
    id: 'openclaw-proxy',
    path: 'OpenClaw proxy · Shamy',
    value: 'Live',
    label: 'production path',
    detail: 'Venice via rootrouter/* — trims chat history every completion',
    method: 'production',
    footnote: 'x-rootrouter-tokens-saved on proxy responses',
  },
  {
    id: 'sdk-benchmark',
    path: 'SDK benchmark · offline',
    value: '~49%',
    label: 'simulated demo savings',
    detail: '50-query TF-IDF + simulated LLM (npm run demo:benchmark -- --seed 42) — not live API',
    method: 'simulated',
  },
];

export const realApiBenchmark = {
  provider: 'NVIDIA NIM',
  status: 'complete' as 'pending' | 'in_progress' | 'complete',
  headline: 'Live API benchmark published',
  description:
    '12-query session on Nemotron 3 Ultra via NVIDIA NIM — 1.6% estimated context reduction on multi-turn chat. Repo MCP cold slice (~95%) remains the strongest audited path.',
  resultUrl: 'https://github.com/RootRouter/RootRouter/blob/main/benchmarks/results/nim-latest.json',
};

export const methodLabels: Record<EvidenceMethod, string> = {
  audited: 'Audited',
  production: 'Production',
  simulated: 'Simulated',
  'live-api': 'Live API',
};
