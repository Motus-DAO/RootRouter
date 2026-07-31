'use client';

import Link from 'next/link';

const playbooks = [
  {
    layer: 'Layer 0',
    title: 'Feng Shui',
    subtitle: 'Workspace placement policies',
    desc: 'Where files live. Run the workspace guard before your first write. Harmonize messy Desktop, Downloads, or home-root clutter with approval-first moves. ',
    href: '/FENG-SHUI.md',
    cta: 'Read FENG-SHUI.md',
  },
  {
    layer: 'Layer 1',
    title: 'RootRouter',
    subtitle: 'Context routing',
    desc: 'What goes in the prompt. Proxy token savings, MCP repo selection, and auditable selection logs — not a network router.',
    href: '/SKILL.md',
    cta: 'Read SKILL.md',
  },
];

export default function AgentOnboardingSection() {
  return (
    <section className="landing-section landing-section-dark" id="agent-onboarding">
      <div className="landing-section-inner">
        <p
          style={{
            fontSize: '1.1rem',
            color: 'var(--prism-cyan)',
            fontFamily: 'var(--font-display)',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: 'center',
          }}
        >
          For agents
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.35rem, 2.2vw, 1.75rem)',
            fontWeight: 600,
            color: 'var(--prism-text)',
            textAlign: 'center',
            marginBottom: '0.75rem',
            lineHeight: 1.25,
          }}
        >
          Agent onboarding — fetch both playbooks
        </h2>
        <p
          style={{
            color: 'var(--prism-text-muted)',
            fontSize: '1.05rem',
            lineHeight: 1.65,
            textAlign: 'center',
            maxWidth: '40rem',
            margin: '0 auto 2rem',
          }}
        >
          Newborn agents (e.g. OpenClaw Shamy) should read Layer 0 before the first write, then Layer 1 before repo or routing work.
          Placement first, context second.
        </p>
        <div className="landing-value-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {playbooks.map((p) => (
            <Link key={p.href} href={p.href} className="landing-value-card" style={{ textDecoration: 'none', display: 'block' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--prism-violet)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {p.layer}
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  color: 'var(--prism-cyan)',
                  margin: '0.35rem 0 0.15rem',
                }}
              >
                {p.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--prism-text-dim)', marginBottom: '0.75rem' }}>{p.subtitle}</p>
              <p style={{ color: 'var(--prism-text-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1rem' }}>{p.desc}</p>
              <span className="landing-cta-secondary" style={{ display: 'inline-block', fontSize: '0.95rem' }}>
                {p.cta} →
              </span>
            </Link>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--prism-text-dim)', fontSize: '0.9rem', marginTop: '1.5rem' }}>
          Paste playbook lines into <code style={{ color: 'var(--prism-cyan)' }}>AGENTS.md</code> ·{' '}
          <a
            href="https://github.com/RootRouter/RootRouter/blob/main/docs/templates/shamy-agents-onboarding.md"
            style={{ color: 'var(--prism-cyan)' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Shamy template
          </a>
        </p>
      </div>
    </section>
  );
}
