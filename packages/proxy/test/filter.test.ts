/**
 * Unit tests for the proxy's pure message filter.
 * Run: tsx test/filter.test.ts
 */
import { filterMessages, messageText, type ChatMessage } from '../src/filter.js';

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string): void {
  if (cond) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name}`);
  }
}

// Repeat text so token estimates are meaningful with a low threshold.
function long(s: string): string {
  return (s + ' ').repeat(8).trim();
}

async function main() {
  console.log('\n=== Passthrough below threshold ===');
  {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'hi' },
    ];
    const out = await filterMessages(messages, { contextBudget: 100, minTokensToFilter: 100000 });
    assert(!out.filtered, 'small prompt not filtered');
    assert(out.messages === messages, 'original array returned unchanged');
    assert(out.tokensSaved === 0, 'no tokens saved below threshold');
  }

  console.log('\n=== System + last user always kept; irrelevant trimmed ===');
  {
    const messages: ChatMessage[] = [
      { role: 'system', content: long('Always keep this system instruction') },
      { role: 'user', content: long('Tell me about quicksort and mergesort sorting algorithms') },
      { role: 'assistant', content: long('Quicksort partitions around a pivot; mergesort divides and merges') },
      { role: 'user', content: long('What is a good recipe for chocolate chip cookies with brown sugar') },
      { role: 'assistant', content: long('Cream butter and brown sugar then fold in chocolate chips') },
      { role: 'user', content: long('Explain the history of the Roman empire and its emperors') },
      { role: 'assistant', content: long('Rome transitioned from republic to empire under Augustus') },
      { role: 'user', content: 'Help me implement a sorting algorithm in code' },
    ];
    const out = await filterMessages(messages, { contextBudget: 60, minTokensToFilter: 50, mmrLambda: 1 });

    assert(out.filtered, 'large prompt was filtered');
    assert(out.tokensSaved > 0, 'reports positive tokens saved');

    const roles = out.messages.map((m) => m.role);
    assert(out.messages[0].role === 'system', 'system message retained at front');
    assert(messageText(out.messages[out.messages.length - 1].content).includes('implement a sorting algorithm'), 'final user query retained at end');
    assert(out.messages.length < messages.length, 'some prior turns dropped');

    // The sorting-related turn should survive over cookies/Rome.
    const keptText = out.messages.map((m) => messageText(m.content)).join(' ');
    assert(keptText.includes('quicksort') || keptText.includes('Quicksort'), 'relevant sorting turn kept');
  }

  console.log('\n=== Order preserved ===');
  {
    const messages: ChatMessage[] = [
      { role: 'system', content: long('system') },
      { role: 'user', content: long('alpha topic about databases and migrations') },
      { role: 'user', content: long('beta topic about networking and tcp udp') },
      { role: 'user', content: 'help with databases and migrations' },
    ];
    const out = await filterMessages(messages, { contextBudget: 1000, minTokensToFilter: 50, mmrLambda: 0.7 });
    // Whatever is kept, indices must be non-decreasing relative to the original order.
    const originalTexts = messages.map((m) => messageText(m.content));
    const keptOriginalPositions = out.messages.map((m) => originalTexts.indexOf(messageText(m.content)));
    const sorted = [...keptOriginalPositions].sort((a, b) => a - b);
    assert(JSON.stringify(keptOriginalPositions) === JSON.stringify(sorted), 'kept messages remain in original order');
  }

  console.log('\n=== No user message -> passthrough ===');
  {
    const messages: ChatMessage[] = [
      { role: 'system', content: long('system only conversation with no user turn present here') },
      { role: 'assistant', content: long('assistant speaking without any user prompt at all here') },
    ];
    const out = await filterMessages(messages, { contextBudget: 10, minTokensToFilter: 10 });
    assert(!out.filtered, 'no user message means no filtering');
  }

  console.log('\n=== Non-string (multimodal) content always kept ===');
  {
    const messages: ChatMessage[] = [
      { role: 'system', content: long('system') },
      { role: 'user', content: [{ type: 'text', text: long('describe this image please') }, { type: 'image_url', image_url: { url: 'http://x/y.png' } }] },
      { role: 'user', content: long('an unrelated boring text turn about taxes and accounting forms') },
      { role: 'user', content: 'what is in the picture' },
    ];
    const out = await filterMessages(messages, { contextBudget: 30, minTokensToFilter: 50, mmrLambda: 1 });
    const hasMultimodal = out.messages.some((m) => Array.isArray(m.content));
    assert(hasMultimodal, 'multimodal message retained even when trimming');
  }

  console.log('\n=== Results ===');
  console.log(`\nTotal: ${passed + failed} tests, ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  else console.log('\nAll proxy filter tests passed!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
