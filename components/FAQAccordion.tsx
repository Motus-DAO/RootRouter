'use client';

import { useState } from 'react';

type FAQItem = {
  question: string;
  answer: string;
};

const faqData: FAQItem[] = [
  {
    question: 'How does RootRouter reduce costs?',
    answer:
      'We send only relevant conversation history to the LLM instead of the full thread. Using root-pair telemetry we discover chambers (regions of similar behavior) and filter context by chamber, graph, and reflection — so you typically save 40–70% of tokens with no quality loss.',
  },
  {
    question: 'What is root-pair telemetry?',
    answer:
      'Every interaction produces a root vector: the difference between intent (query embedding) and execution (response embedding). Collecting these reveals geometric structure in how your agent behaves. We use that structure for context filtering and model routing, and log it on Celo for verification.',
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div style={{ maxWidth: '640px' }}>
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
