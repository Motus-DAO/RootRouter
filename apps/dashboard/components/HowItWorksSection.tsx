import Link from 'next/link';

const steps = [
  {
    layer: '0',
    title: 'Workspace placement',
    desc: 'Feng Shui — validate where files go before the first write. No more repos at ~/ or artifacts in Downloads.',
    href: '/FENG-SHUI.md',
    linkLabel: 'FENG-SHUI.md',
  },
  {
    layer: '1',
    title: 'Context routing',
    desc: 'RootRouter MCP selects budgeted repo chunks on cold slices. Proxy trims chat history on every OpenClaw completion.',
    href: '/SKILL.md',
    linkLabel: 'SKILL.md',
  },
  {
    layer: '2',
    title: 'Telemetry & audit',
    desc: 'selections.jsonl logs what was selected and tokens saved. Optional Celo contract for on-chain stats.',
    href: '/dashboard/topology',
    linkLabel: 'Topology',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="landing-section landing-section-gradient">
      <div className="landing-section-inner">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.35rem, 2.2vw, 1.65rem)',
            fontWeight: 600,
            color: 'var(--prism-text)',
            textAlign: 'center',
            marginBottom: '0.5rem',
          }}
        >
          How it works
        </h2>
        <p
          style={{
            color: 'var(--prism-text-muted)',
            fontSize: '1.05rem',
            textAlign: 'center',
            maxWidth: '36rem',
            margin: '0 auto 2rem',
            lineHeight: 1.65,
          }}
        >
          Placement first, context second, evidence third. The algebraic layer (chambers, graphs) powers selection —{' '}
          <Link
            href="https://github.com/RootRouter/RootRouter/blob/main/docs/architecture.md"
            style={{ color: 'var(--prism-cyan)' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            read the math
          </Link>{' '}
          when you need depth.
        </p>
        <div className="landing-value-grid">
          {steps.map((s) => (
            <div key={s.layer} className="landing-value-card">
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--prism-violet)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                }}
              >
                LAYER {s.layer}
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.15rem',
                  color: 'var(--prism-text)',
                  margin: '0.35rem 0 0.5rem',
                }}
              >
                {s.title}
              </h3>
              <p style={{ color: 'var(--prism-text-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                {s.desc}
              </p>
              <Link href={s.href} className="landing-cta-secondary" style={{ fontSize: '0.9rem' }}>
                {s.linkLabel} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
