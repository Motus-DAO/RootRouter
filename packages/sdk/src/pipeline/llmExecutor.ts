import type { ExecuteLLMInput, ExecuteLLMOutput, RouterConfig } from '../types';

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_BACKOFF_MS = 500;

export type LLMCaller = (params: {
  model: string;
  messages: Array<{ role: string; content: string }>;
}) => Promise<ExecuteLLMOutput>;

/**
 * Stage: executeLLM
 * Calls the LLM with retry and exponential backoff. Catches and rethrows with stage context.
 */
export async function executeLLM(
  config: RouterConfig,
  input: ExecuteLLMInput,
  callLLM: LLMCaller,
  options?: { maxRetries?: number; initialBackoffMs?: number }
): Promise<ExecuteLLMOutput> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialBackoffMs = options?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callLLM({
        model: input.model,
        messages: input.messages,
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = initialBackoffMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  const message = lastError?.message ?? 'Unknown LLM error';
  throw new Error(`executeLLM failed after ${maxRetries + 1} attempts: ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
