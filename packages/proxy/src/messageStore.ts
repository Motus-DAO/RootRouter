import { createHash } from 'crypto';
import type { ContextItem } from 'rootrouter';
import type { ChatMessage } from './filter.js';
import { messageText } from './filter.js';

/** Stable id for a chat turn in the shared store (scoped per agent). */
export function stableMessageId(agentId: string, role: string, content: string): string {
  return createHash('sha256').update(`${agentId}\0${role}\0${content}`).digest('hex').slice(0, 24);
}

/** Convert recordable string user/assistant turns into ContextItems for the store. */
export function messagesToStoreItems(
  messages: ChatMessage[],
  agentId: string
): ContextItem[] {
  const items: ContextItem[] = [];
  const now = Date.now();
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    if (typeof m.content !== 'string') continue;
    const text = messageText(m.content);
    if (!text.trim()) continue;
    items.push({
      id: stableMessageId(agentId, m.role, text),
      text,
      kind: 'message',
      agentId,
      timestamp: now + i,
      metadata: { role: m.role, source: 'proxy', messageIndex: i },
    });
  }
  return items;
}

/** In-request candidate items (ids `req:<index>`) for the current request only. */
export function messagesToRequestCandidates(
  messages: ChatMessage[],
  lastUserIndex: number
): ContextItem[] {
  const items: ContextItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (i === lastUserIndex) continue;
    const m = messages[i];
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    if (typeof m.content !== 'string') continue;
    const text = messageText(m.content);
    if (!text.trim()) continue;
    items.push({
      id: `req:${i}`,
      text,
      kind: 'message',
      timestamp: i,
      metadata: { role: m.role, source: 'request', messageIndex: i },
    });
  }
  return items;
}

/** Store items not duplicated by text in the current request candidate set. */
export function storeItemsExcludingRequest(
  storeItems: ContextItem[],
  requestTexts: Set<string>
): ContextItem[] {
  return storeItems.filter((item) => !requestTexts.has(item.text));
}
