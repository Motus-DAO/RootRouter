'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Contract, JsonRpcProvider } from 'ethers';

const CELO_RPC_URL = 'https://forno.celo.org';
const TELEMETRY_ADDRESS = '0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab';

const TELEMETRY_ABI = [
  'function getStats(address _agent) view returns (uint256 interactions, uint256 tokensSaved)',
  'function getRecentEntries(address _agent, uint256 _count) view returns (tuple(uint32 chamberId, uint16 rootNorm, uint8 modelTier, uint32 tokensSaved, uint32 timestamp)[])',
] as const;

/** Rough USD per token saved (powerful vs fast delta). Used for dashboard cost estimate when chain does not report cost. */
export const ESTIMATED_USD_PER_TOKEN_SAVED = 40e-6;

const provider = new JsonRpcProvider(CELO_RPC_URL);

type RawStats = {
  interactions: bigint;
  tokensSaved: bigint;
};

type RawEntry = {
  chamberId: bigint;
  rootNorm: bigint;
  modelTier: bigint;
  tokensSaved: bigint;
  timestamp: bigint;
};

export type TelemetryStats = {
  interactions: number;
  tokensSaved: number;
};

export type TelemetryEntry = {
  chamberId: number;
  rootNorm: number;
  modelTier: number;
  tokensSaved: number;
  timestamp: number;
};

export type ModelTierSummary = {
  tier: number;
  label: string;
  count: number;
  percent: number;
};

export type UseCeloTelemetryResult = {
  loading: boolean;
  error: string | null;
  stats: TelemetryStats | null;
  entries: TelemetryEntry[];
  /** Estimated cost saved (USD) from tokensSaved * ESTIMATED_USD_PER_TOKEN_SAVED */
  estimatedCostSavedUsd: number;
  /** Most used model tier and distribution (Fast / Balanced / Powerful) */
  modelSummary: ModelTierSummary[];
  primaryModel: { label: string; percent: number } | null;
  reload: () => Promise<void>;
  lastLoadedCount: number;
};

const DEFAULT_RECENT_COUNT = 128;

export function useCeloTelemetry(agentAddress: string): UseCeloTelemetryResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [entries, setEntries] = useState<TelemetryEntry[]>([]);
  const [lastLoadedCount, setLastLoadedCount] = useState(0);
  const agentRef = useRef<string | null>(agentAddress || null);

  const modelTierLabels: Record<number, string> = { 0: 'Fast', 1: 'Balanced', 2: 'Powerful' };
  const estimatedCostSavedUsd = stats ? stats.tokensSaved * ESTIMATED_USD_PER_TOKEN_SAVED : 0;
  const { modelSummary, primaryModel } = (() => {
    if (entries.length === 0) return { modelSummary: [] as ModelTierSummary[], primaryModel: null as { label: string; percent: number } | null };
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    entries.forEach((e) => {
      if (e.modelTier >= 0 && e.modelTier <= 2) counts[e.modelTier] += 1;
    });
    const total = entries.length;
    const modelSummary: ModelTierSummary[] = [0, 1, 2].map((tier) => ({
      tier,
      label: modelTierLabels[tier] ?? `Tier ${tier}`,
      count: counts[tier] ?? 0,
      percent: total > 0 ? ((counts[tier] ?? 0) / total) * 100 : 0,
    }));
    const byCount = [...modelSummary].sort((a, b) => b.count - a.count);
    const top = byCount[0];
    const primaryModel = top && top.count > 0 ? { label: top.label, percent: top.percent } : null;
    return { modelSummary, primaryModel };
  })();

  useEffect(() => {
    agentRef.current = agentAddress || null;
  }, [agentAddress]);

  const fetchForAgent = useCallback(async (address: string) => {
    const contract = new Contract(TELEMETRY_ADDRESS, TELEMETRY_ABI, provider);
    const [rawStats, rawEntries] = await Promise.all([
      contract.getStats(address) as Promise<RawStats>,
      contract.getRecentEntries(address, BigInt(DEFAULT_RECENT_COUNT)) as Promise<RawEntry[]>,
    ]);

    setStats({
      interactions: Number(rawStats.interactions),
      tokensSaved: Number(rawStats.tokensSaved),
    });
    const parsed: TelemetryEntry[] = rawEntries.map((e) => ({
      chamberId: Number(e.chamberId),
      rootNorm: Number(e.rootNorm),
      modelTier: Number(e.modelTier),
      tokensSaved: Number(e.tokensSaved),
      timestamp: Number(e.timestamp),
    }));
    setEntries(parsed);
    setLastLoadedCount(parsed.length);
  }, []);

  const reload = useCallback(async () => {
    const addr = agentRef.current;
    if (!addr) return;
    try {
      setLoading(true);
      setError(null);
      await fetchForAgent(addr);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error loading telemetry');
    } finally {
      setLoading(false);
    }
  }, [fetchForAgent]);

  useEffect(() => {
    if (!agentAddress) {
      setStats(null);
      setEntries([]);
      setLastLoadedCount(0);
      return;
    }
    void reload();
  }, [agentAddress, reload]);

  return {
    loading,
    error,
    stats,
    entries,
    estimatedCostSavedUsd,
    modelSummary,
    primaryModel,
    reload,
    lastLoadedCount,
  };
}
