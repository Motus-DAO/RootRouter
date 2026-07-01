/**
 * Landing page evidence — update here when NVIDIA NIM (or other) real-API benchmarks ship.
 * Keep methods honest: audited | production | simulated | pending
 */

export type EvidenceMethod = 'audited' | 'production' | 'simulated' | 'pending';

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
    path: 'SDK benchmark',
    value: '~49%',
    label: 'simulated demo savings',
    detail: '50-query run — TF-IDF embeddings + simulated LLM (npm run demo:benchmark -- --seed 42)',
    method: 'simulated',
    footnote: 'Not a live API benchmark. Real completions benchmark pending.',
  },
];

/** Flip to `in_progress` / `complete` when NIM key is ready and benchmark runs. */
export const realApiBenchmark = {
  provider: 'NVIDIA NIM',
  status: 'pending' as 'pending' | 'in_progress' | 'complete',
  headline: 'Real API benchmark coming',
  description:
    'We will publish reproducible savings with live completions (NVIDIA NIM free tier) to replace headline reliance on the simulated SDK demo.',
};

export const methodLabels: Record<EvidenceMethod, string> = {
  audited: 'Audited',
  production: 'Production',
  simulated: 'Simulated',
  pending: 'Pending',
};
