import Link from 'next/link';
import Image from 'next/image';
import FAQAccordion from '../components/FAQAccordion';
import HeroSnapshotGraphs from '../components/HeroSnapshotGraphs';
import GetStartedSection from '../components/GetStartedSection';

export const metadata = {
  title: 'RootRouter — Algebraic Agent Infrastructure',
  description:
    'Cut your agent\'s LLM costs 40–70% with root-pair telemetry, interaction graphs, and symmetry-aware context filtering. Verifiable on-chain analytics on Celo.',
};

const valueProps = [
  {
    title: 'Proactive context filtering',
    desc: 'Send only relevant history to the LLM. Chambers and the interaction graph decide what matters — no more full-thread bloat.',
    icon: (
      <svg className="landing-value-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Real-time, full-chain visibility',
    desc: 'Telemetry on Celo. Every interaction is logged on-chain for verifiable, auditable agent infrastructure.',
    icon: (
      <svg className="landing-value-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
      </svg>
    ),
  },
  {
    title: 'Build with confidence',
    desc: 'Same or better intent–execution alignment. Easy tasks use cheap models; hard tasks use powerful ones. Route by geometry, not guesswork.',
    icon: (
      <svg className="landing-value-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

const stats = [
  { value: '40–70%', label: 'Typical cost savings' },
  { value: '~49%', label: 'Benchmark run (50 queries)' },
  { value: '19+', label: 'Chambers auto-discovered' },
  { value: 'Celo', label: 'On-chain telemetry' },
];

const resources = [
  { title: 'Dashboard', desc: 'View telemetry and topology', href: '/dashboard' },
  { title: 'Topology', desc: 'Agent and interaction graphs', href: '/dashboard/topology' },
  { title: 'npm', desc: 'Install rootrouter', href: 'https://www.npmjs.com/package/rootrouter', external: true },
  { title: 'GitHub', desc: 'Source and demos', href: 'https://github.com/Motus-DAO/RootRouter', external: true },
];

const footerLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/topology', label: 'Topology' },
  { href: 'https://github.com/Motus-DAO/RootRouter', label: 'GitHub', external: true },
  { href: 'https://www.npmjs.com/package/rootrouter', label: 'npm', external: true },
];

export default function HomePage() {
  return (
    <>
      {/* Hero: dark, two-col, headline left / visual right */}
      <section className="landing-section landing-section-dark">
        <div className="landing-section-inner landing-two-col">
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                fontWeight: 600,
                color: 'var(--prism-text)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                marginBottom: '1rem',
              }}
            >
              Secure everything you build and run with agents onchain.
            </h1>
            <p
              style={{
                fontSize: '1.15rem',
                color: 'var(--prism-text-muted)',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
                maxWidth: '28rem',
              }}
            >
              Cut agent LLM costs 40–70% with root-pair telemetry, interaction graphs, and symmetry-aware context filtering. Verifiable on Celo.
            </p>
            <Link href="/dashboard" className="landing-cta-primary">
              Open Dashboard
            </Link>
          </div>
          <div className="landing-hero-visual">
            <HeroSnapshotGraphs />
          </div>
        </div>
      </section>

      {/* Feature 1: panel, two-col — image left, text right */}
      <section className="landing-section landing-section-panel">
        <div className="landing-section-inner landing-two-col">
          <div className="landing-hero-visual">
            <div
              className="crystal-glass-prism"
              style={{
                padding: '0.75rem',
                position: 'relative',
                zIndex: 1,
                borderRadius: 'var(--prism-radius)',
                overflow: 'hidden',
              }}
            >
              <Image
                src="/2-600-cells-smaller.png"
                alt="Root structure and chambers"
                width={480}
                height={320}
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'var(--prism-radius-sm)' }}
              />
            </div>
          </div>
          <div>
            <p style={{ fontSize: '1.1rem', color: 'var(--prism-cyan)', fontFamily: 'var(--font-display)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              For you
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                fontWeight: 600,
                color: 'var(--prism-text)',
                marginBottom: '1rem',
                lineHeight: 1.25,
              }}
            >
              Algebraic context filtering
            </h2>
            <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.1rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              Root vectors and chambers form a geometric view of how your agent behaves. We filter context by chamber, graph, and reflection — so you send exactly what’s relevant, not the whole thread.
            </p>
            <Link href="/dashboard" className="landing-cta-secondary">
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Trust / value props: dark strip, 3 cards */}
      <section className="landing-section landing-section-dark">
        <div className="landing-section-inner">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
              fontWeight: 600,
              color: 'var(--prism-text)',
              textAlign: 'center',
              marginBottom: '0.5rem',
            }}
          >
            Why RootRouter
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--prism-text-muted)', fontSize: '1.05rem', marginBottom: '2rem' }}>
            Proactive, verifiable agent infrastructure.
          </p>
          <div className="landing-value-grid">
            {valueProps.map((item, i) => (
              <div key={i} className="landing-value-card">
                {item.icon}
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--prism-text)', marginBottom: '0.5rem' }}>
                  {item.title}
                </h3>
                <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.1rem', lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature 2: gradient, two-col — text left, visual right */}
      <section className="landing-section landing-section-gradient">
        <div className="landing-section-inner landing-two-col">
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                fontWeight: 600,
                color: 'var(--prism-text)',
                marginBottom: '1rem',
                lineHeight: 1.25,
              }}
            >
              Root-pair telemetry and model routing
            </h2>
            <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.1rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              Every interaction produces a root vector (intent minus execution). We use it to discover chambers, filter context, and route easy tasks to fast models and hard tasks to powerful ones. For swarms, the topology graph routes to the right agent per chamber.
            </p>
            <Link href="/dashboard/topology" className="landing-cta-secondary">
              View topology
            </Link>
          </div>
          <div className="landing-hero-visual">
            <div
              className="holo-card-prism"
              style={{
                padding: '2rem',
                position: 'relative',
                zIndex: 1,
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '80%',
                  height: '80%',
                  border: '2px solid rgba(0, 255, 204, 0.3)',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, rgba(0, 255, 204, 0.15), transparent 60%)',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--prism-cyan)', fontSize: '2rem' }}>◇</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: darker, two-col — visual left, text right */}
      <section className="landing-section landing-section-darker">
        <div className="landing-section-inner landing-two-col">
          <div className="landing-hero-visual">
            <div
              className="holo-card-prism"
              style={{
                padding: '2rem',
                position: 'relative',
                zIndex: 1,
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--prism-cyan)' }}>
                <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                fontWeight: 600,
                color: 'var(--prism-text)',
                marginBottom: '1rem',
                lineHeight: 1.25,
              }}
            >
              Verifiable agent infrastructure on Celo
            </h2>
            <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.1rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              Telemetry is logged on-chain. Other agents can query the contract to assess performance before delegating. ERC-8004 compatible — discoverable as a Trustless Agent in the Celo ecosystem.
            </p>
            <Link href="/dashboard" className="landing-cta-secondary">
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* How do I get started? – visible on scroll */}
      <GetStartedSection />

      {/* Get started – resource cards under the terminal */}
      <section className="landing-section landing-section-panel">
        <div className="landing-section-inner">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
              fontWeight: 600,
              color: 'var(--prism-text)',
              marginBottom: '1.5rem',
            }}
          >
            Get started
          </h2>
          <div className="landing-resource-cards">
            {resources.map((r, i) => (
              <Link
                key={i}
                href={r.href}
                className="landing-resource-card"
                {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--prism-cyan)', marginBottom: '0.35rem' }}>
                  {r.title} →
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--prism-text-muted)', lineHeight: 1.4 }}>
                  {r.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ: panel */}
      <section className="landing-section landing-section-panel">
        <div className="landing-section-inner">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
              fontWeight: 600,
              color: 'var(--prism-text)',
              marginBottom: '0.25rem',
            }}
          >
            Leading algebraic agent infrastructure.
          </h2>
          <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
            Trusted by builders who care about cost and verification.
          </p>
          <FAQAccordion />
        </div>
      </section>

      {/* Stats: dark */}
      <section className="landing-section landing-section-dark">
        <div className="landing-section-inner">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
              fontWeight: 600,
              color: 'var(--prism-text)',
              textAlign: 'center',
              marginBottom: '2rem',
            }}
          >
            By the numbers
          </h2>
          <div className="landing-stats-grid">
            {stats.map((s, i) => (
              <div key={i} className="landing-stat-item">
                <div className="landing-stat-value">{s.value}</div>
                <div className="landing-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip – transparent, no background */}
      <section className="landing-section" style={{ textAlign: 'center', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div className="landing-section-inner">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
              fontWeight: 600,
              color: 'var(--prism-text)',
              marginBottom: '0.75rem',
            }}
          >
            Ready to get started?
          </h2>
          <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
            Open the dashboard and load telemetry from Celo, or install the SDK and wrap your chat calls.
          </p>
          <Link href="/dashboard" className="landing-cta-primary">
            Open Dashboard
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: 'var(--prism-cyan)',
              textDecoration: 'none',
            }}
          >
            RootRouter
          </Link>
          <div className="landing-footer-links">
            {footerLinks.map(({ href, label, external }) => (
              <Link key={href} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {label}
              </Link>
            ))}
          </div>
          <span style={{ fontSize: '0.95rem', color: 'var(--prism-text-dim)' }}>
            Algebraic agent infrastructure. Verifiable on Celo. By MotusDAO.
          </span>
        </div>
      </footer>
    </>
  );
}
