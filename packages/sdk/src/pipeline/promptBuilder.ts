import type { BuildPromptInput, BuildPromptOutput } from '../types';

/**
 * Stage: buildPrompt
 * Builds the message list for the LLM from filtered context + latest user message.
 */
export function buildPrompt(input: BuildPromptInput): BuildPromptOutput {
  const { filterResult, userMessages } = input;
  const contextMessages: Array<{ role: string; content: string }> = [];

  for (const pair of filterResult.filteredPairs) {
    contextMessages.push({ role: 'user', content: pair.query });
    contextMessages.push({ role: 'assistant', content: pair.response });
  }
  const lastUser = userMessages.slice(-1).map(m => ({ role: m.role, content: m.content }));
  contextMessages.push(...lastUser);

  return { messages: contextMessages };
}
