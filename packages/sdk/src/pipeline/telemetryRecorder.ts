import type { ModelTier } from '../types';
import type { RecordTelemetryInput } from '../types';
import type { ChatPipelineDeps } from './types';

const TIER_MAP: Record<ModelTier, number> = { fast: 0, balanced: 1, powerful: 2 };

/**
 * Stage: recordTelemetry
 * Queues one telemetry entry to the configured sink (Celo or local fallback).
 * When SAFE_MODE is true, skips queueing to avoid any on-chain writes.
 */
export function recordTelemetry(deps: ChatPipelineDeps, input: RecordTelemetryInput): void {
  const { config, telemetry } = deps;
  if (config.safeMode) return; // No on-chain writes in SAFE_MODE
  if (!telemetry.isConfigured()) return;

  const modelTier = TIER_MAP[input.routingDecision.modelTier] ?? 1;
  telemetry.queue({
    agentAddress: input.agentId,
    chamberId: input.rootPair.chamberId ?? 0,
    rootNorm: input.rootPair.rootNorm,
    modelTier,
    tokensSaved: input.tokensSaved,
    timestamp: Date.now(),
  });
}
