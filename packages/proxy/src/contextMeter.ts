/**
 * In-process context health metrics for GET /context.
 * Resets when the proxy process restarts (no durable history).
 */

export interface ContextRequestSample {
  at: string;
  agentId: string;
  model?: string;
  filtered: boolean;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  storeRecalled: number;
  contextBudget: number;
  /** tokensAfter / contextBudget — how full the selectable budget is after trim. */
  budgetFill: number;
}

export interface ContextAgentRollup {
  agentId: string;
  requests: number;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  storeRecalled: number;
}

export interface ContextMeterSnapshot {
  ok: true;
  startedAt: string;
  uptimeSec: number;
  contextBudget: number;
  minTokensToFilter: number;
  last: ContextRequestSample | null;
  session: {
    requests: number;
    tokensBefore: number;
    tokensAfter: number;
    tokensSaved: number;
    storeRecalled: number;
  };
  byAgent: ContextAgentRollup[];
}

const startedAt = new Date();
let last: ContextRequestSample | null = null;
const byAgent = new Map<string, ContextAgentRollup>();
const session = {
  requests: 0,
  tokensBefore: 0,
  tokensAfter: 0,
  tokensSaved: 0,
  storeRecalled: 0,
};

function emptyRollup(agentId: string): ContextAgentRollup {
  return {
    agentId,
    requests: 0,
    tokensBefore: 0,
    tokensAfter: 0,
    tokensSaved: 0,
    storeRecalled: 0,
  };
}

export function recordContextSample(input: {
  agentId: string;
  model?: string;
  filtered: boolean;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  storeRecalled: number;
  contextBudget: number;
}): ContextRequestSample {
  const sample: ContextRequestSample = {
    at: new Date().toISOString(),
    agentId: input.agentId,
    model: input.model,
    filtered: input.filtered,
    tokensBefore: input.tokensBefore,
    tokensAfter: input.tokensAfter,
    tokensSaved: input.tokensSaved,
    storeRecalled: input.storeRecalled,
    contextBudget: input.contextBudget,
    budgetFill:
      input.contextBudget > 0
        ? Math.round((input.tokensAfter / input.contextBudget) * 1000) / 1000
        : 0,
  };

  last = sample;
  session.requests += 1;
  session.tokensBefore += sample.tokensBefore;
  session.tokensAfter += sample.tokensAfter;
  session.tokensSaved += sample.tokensSaved;
  session.storeRecalled += sample.storeRecalled;

  const roll = byAgent.get(sample.agentId) ?? emptyRollup(sample.agentId);
  roll.requests += 1;
  roll.tokensBefore += sample.tokensBefore;
  roll.tokensAfter += sample.tokensAfter;
  roll.tokensSaved += sample.tokensSaved;
  roll.storeRecalled += sample.storeRecalled;
  byAgent.set(sample.agentId, roll);

  return sample;
}

export function getContextMeterSnapshot(opts: {
  contextBudget: number;
  minTokensToFilter: number;
}): ContextMeterSnapshot {
  return {
    ok: true,
    startedAt: startedAt.toISOString(),
    uptimeSec: Math.floor((Date.now() - startedAt.getTime()) / 1000),
    contextBudget: opts.contextBudget,
    minTokensToFilter: opts.minTokensToFilter,
    last,
    session: { ...session },
    byAgent: [...byAgent.values()].sort((a, b) => b.tokensSaved - a.tokensSaved),
  };
}

/** Test helper */
export function resetContextMeterForTests(): void {
  last = null;
  byAgent.clear();
  session.requests = 0;
  session.tokensBefore = 0;
  session.tokensAfter = 0;
  session.tokensSaved = 0;
  session.storeRecalled = 0;
}
