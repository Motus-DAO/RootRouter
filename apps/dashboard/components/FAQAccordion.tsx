'use client';

import { useState } from 'react';

type FAQItem = {
  question: string;
  answer: string;
};

const faqData: FAQItem[] = [
  {
    question: 'What savings should I expect?',
    answer:
      'It depends on the path. Cursor MCP cold-slice selection saved 95.5% (~96%) against its full indexed-corpus baseline. A 24-step, three-agent NVIDIA NIM swarm saved an estimated 46% of accumulated chat context using real Nemotron 3 Ultra completions. OpenClaw proxy trims growing chat history every completion. The offline SDK benchmark models ~49% savings on a seeded 50-query run.',
  },
  {
    question: 'When do I use MCP vs the proxy?',
    answer:
      'Proxy only: passive chat-history trim on every /chat/completions (OpenClaw, HTTP agents). MCP: active repo selection — index_repo once, then shaped select_context on cold slices. Use both together: MCP for codebase load, proxy for conversation trim. Do not stack proxy + SDK.chat() on the same request.',
  },
  {
    question: 'What is Feng Shui vs RootRouter?',
    answer:
      'Feng Shui (Layer 0) is workspace placement — where agents write files, harmonize clutter, run workspace_guard before writes. RootRouter (Layer 1) is context routing — what goes in the prompt via MCP, proxy, and chambers. Placement first, context second.',
  },
  {
    question: 'Is Celo required?',
    answer:
      'No. Celo telemetry is optional. You can use MCP + proxy with zero on-chain setup. The dashboard can load contract stats when you configure RPC + agent address.',
  },
  {
    question: 'What is root-pair telemetry?',
    answer:
      'Every interaction can produce a root vector (intent minus execution). Chambers and graphs use that structure for filtering and routing. This is research-grade machinery — read docs/architecture.md for depth. The landing page focuses on the operational harness; the math is linked, not hidden.',
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div style={{ maxWidth: '720px' }}>
      {faqData.map((item, i) => (
        <div key={i} className="landing-accordion-item">
          <button
            type="button"
            className="landing-accordion-trigger"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            aria-expanded={openIndex === i}
          >
            {item.question}
            <span className="landing-accordion-icon" aria-hidden>
              {openIndex === i ? '−' : '+'}
            </span>
          </button>
          {openIndex === i && (
            <div className="landing-accordion-panel">
              <div className="landing-accordion-content">{item.answer}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
