import { estimateTokens } from '../math/vectors';
import type { ModelCapability } from './types';

/** OpenAI-style message with string or multimodal content. */
export interface RoutableMessage {
  role: string;
  content: unknown;
}

const CODE_KEYWORDS =
  /\b(debug|refactor|implement|typescript|javascript|python|solidity|rust|compile|function|class|api|endpoint|bug|fix|test suite|unit test|integration test)\b/i;

const REASONING_KEYWORDS =
  /\b(prove|analyze step by step|step[- ]by[- ]step|reasoning|why does|explain why|think through|derive|theorem|logic)\b/i;

const LONG_CONTEXT_CHAR_THRESHOLD = 80_000;
const LONG_CONTEXT_TOKEN_THRESHOLD = 20_000;

function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part !== 'object' || part === null) return '';
      const p = part as Record<string, unknown>;
      if (p.type === 'text' && typeof p.text === 'string') return p.text;
      return '';
    })
    .join(' ');
}

function hasVisionContent(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  return content.some((part) => {
    if (typeof part !== 'object' || part === null) return false;
    const p = part as Record<string, unknown>;
    const t = String(p.type ?? '');
    return t === 'image_url' || t === 'image';
  });
}

/**
 * Infer task capabilities from messages without an extra LLM call.
 */
export function detectCapabilities(
  messages: RoutableMessage[],
  contextTokensBefore?: number
): ModelCapability[] {
  const caps = new Set<ModelCapability>(['chat']);

  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUser = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;

  for (const msg of messages) {
    if (hasVisionContent(msg.content)) {
      caps.add('vision');
      break;
    }
  }

  if (lastUser) {
    const text = messageText(lastUser.content);
    if (CODE_KEYWORDS.test(text)) caps.add('code');
    if (REASONING_KEYWORDS.test(text)) caps.add('reasoning');
    if (text.length >= LONG_CONTEXT_CHAR_THRESHOLD) caps.add('long-context');
  }

  if (contextTokensBefore !== undefined && contextTokensBefore >= LONG_CONTEXT_TOKEN_THRESHOLD) {
    caps.add('long-context');
  }

  return [...caps];
}

/** Extract plain text from the last user message (for heuristics / logging). */
export function lastUserMessageText(messages: RoutableMessage[]): string {
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) return '';
  return messageText(userMessages[userMessages.length - 1].content);
}

/** Token estimate for all messages (cheap heuristic). */
export function estimateMessagesTokens(messages: RoutableMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(messageText(m.content)), 0);
}
