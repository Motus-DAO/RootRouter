import Link from 'next/link';

export const metadata = {
  title: 'RootRouter — Algebraic Agent Infrastructure',
  description:
    'Cut your agent\'s LLM costs 40–70% with root-pair telemetry, interaction graphs, and symmetry-aware context filtering. Verifiable on-chain analytics on Celo.',
};

export default function HomePage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
      {/* Hero */}
      <header
        style={{
          textAlign: 'center',
          marginBottom: '3rem',
          paddingBottom: '2rem',
          borderBottom: '1px solid var(--prism-border)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            fontWeight: 600,
            color: 'var(--prism-cyan)',
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem',
          }}
        >
          🌿 RootRouter
        </h1>
        <p
          style={{
            fontSize: '1.125rem',
            color: 'var(--prism-text-muted)',
            marginBottom: '0.5rem',
          }}
        >
          Algebraic Agent Infrastructure for AI Swarms
        </p>
        <p style={{ fontSize: '0.95rem', color: 'var(--prism-text-dim)' }}>
          Cut your agent&apos;s LLM costs 40–70% with root-pair telemetry, interaction graphs, and
          symmetry-aware context filtering. Verifiable on-chain analytics on Celo · ERC-8004
          compatible.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            marginTop: '1.25rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '999px',
            border: '1px solid rgba(0, 255, 255, 0.4)',
            background: 'linear-gradient(to right, rgba(0, 229, 255, 0.25), rgba(225, 68, 255, 0.2))',
            color: '#fff',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-display)',
            textDecoration: 'none',
          }}
        >
          Open Dashboard →
        </Link>
      </header>

      {/* Problem */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            color: 'var(--prism-cyan)',
            marginBottom: '0.75rem',
          }}
        >
          The Problem
        </h2>
        <p style={{ color: 'var(--prism-text-muted)', fontSize: '0.95rem', lineHeight: 1.65 }}>
          AI agents are expensive. Every autonomous agent burns tokens sending{' '}
          <strong style={{ color: 'var(--prism-text)' }}>full conversation history</strong> on every
          LLM call. A typical session accumulates 50K+ tokens of context, but most of it is irrelevant
          to the current query. OpenRouter routes between models but doesn&apos;t optimize what gets
          sent. The result: agents waste 40–70% of their token budget, use expensive models for
          simple tasks, and have no way to verify their decision-making on-chain.
        </p>
      </section>

      {/* Solution — 3 pillars */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            color: 'var(--prism-cyan)',
            marginBottom: '1rem',
          }}
        >
          The Solution
        </h2>
        <p style={{ color: 'var(--prism-text-muted)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
          RootRouter is middleware between your agents and their LLM providers. It does three things:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            {
              title: 'Root-Pair Telemetry',
              desc: 'Every interaction produces a root pair: the gap between intent (query embedding) and execution (response embedding). The root vector measures how well the agent fulfilled the request. Collect enough and geometric structure emerges — preferred directions, regions, and algebraic symmetry.',
            },
            {
              title: 'Algebraic Context Filtering',
              desc: 'PCA finds root directions (principal axes). These define chambers — regions where the agent performs similarly. Context retrieval uses chamber retrieval, graph retrieval, and reflection retrieval. This replaces "send everything" with "send exactly what\'s relevant."',
            },
            {
              title: 'Intelligent Model Routing',
              desc: 'Each chamber has a historical difficulty score. Easy chambers → fast cheap models. Hard chambers → powerful models. For swarms, the agent topology graph routes tasks to the specialist. All telemetry is logged on Celo for verifiable, auditable infrastructure.',
            },
          ].map((item, i) => (
            <li
              key={i}
              className="holo-card-prism"
              style={{
                padding: '1rem 1.25rem',
                marginBottom: '0.75rem',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.95rem',
                  color: 'var(--prism-violet)',
                  marginBottom: '0.4rem',
                }}
              >
                {item.title}
              </h3>
              <p style={{ color: 'var(--prism-text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Results */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            color: 'var(--prism-cyan)',
            marginBottom: '0.75rem',
          }}
        >
          Results
        </h2>
        <div
          className="crystal-glass-prism"
          style={{
            padding: '1rem 1.25rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            overflowX: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <pre style={{ margin: 0, color: 'var(--prism-text-muted)' }}>
            {` Metric              Baseline         RootRouter       Savings
 ─────────────────────────────────────────────────────────────
 Total Cost           ~$1.00           ~$0.51           ~49%
 Context Tokens       27,245           filtered         36,317 saved
 Quality (norm)       1.3043           1.3043           ~same
 Active Chambers      —                ~19              auto-discovered
 Root Directions      —                5                ~50% variance
 Graph Edges          —                ~81              ~4.0 avg degree`}
          </pre>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--prism-text-dim)', marginTop: '0.5rem' }}>
          Run <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>npx tsx demo/benchmark.ts</code> to
          reproduce. Numbers from 50-query benchmark.
        </p>
      </section>

      {/* Quick start */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            color: 'var(--prism-cyan)',
            marginBottom: '0.75rem',
          }}
        >
          Quick Start
        </h2>
        <ul style={{ color: 'var(--prism-text-muted)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
          <li>
            <strong style={{ color: 'var(--prism-text)' }}>Demos (offline):</strong>{' '}
            <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>npx tsx demo/basic.ts</code>,{' '}
            <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>demo/benchmark.ts</code>,{' '}
            <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>demo/swarm.ts</code> — no API keys required.
          </li>
          <li>
            <strong style={{ color: 'var(--prism-text)' }}>Live telemetry:</strong> Open the{' '}
            <Link href="/dashboard" style={{ color: 'var(--prism-cyan)' }}>Dashboard</Link>, enter an agent address (e.g. your deployer), and click Load from Celo.
          </li>
          <li>
            <strong style={{ color: 'var(--prism-text)' }}>Use in your agent:</strong> Install the library, configure <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>.env</code> (LLM + Celo), then wrap your chat calls with <code style={{ padding: '0.1rem 0.3rem', background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>router.chat()</code>.
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section
        style={{
          textAlign: 'center',
          padding: '2rem',
          borderTop: '1px solid var(--prism-border)',
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.25rem',
            borderRadius: '999px',
            border: '1px solid rgba(0, 255, 255, 0.4)',
            background: 'rgba(0, 255, 204, 0.08)',
            color: 'var(--prism-cyan)',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-display)',
            textDecoration: 'none',
          }}
        >
          View telemetry on Dashboard →
        </Link>
      </section>
    </main>
  );
}
