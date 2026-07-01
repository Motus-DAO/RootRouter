import Link from 'next/link';
import FAQAccordion from '../components/FAQAccordion';
import HeroSnapshotGraphs from '../components/HeroSnapshotGraphs';
import GetStartedSection from '../components/GetStartedSection';
import AgentOnboardingSection from '../components/AgentOnboardingSection';
import ProofSection from '../components/ProofSection';
import HowItWorksSection from '../components/HowItWorksSection';
import ShamyProductionSection from '../components/ShamyProductionSection';

export const metadata = {
  title: 'RootRouter — Agent Context & Operations Harness',
  description:
    'Discipline AI agents: workspace placement (Feng Shui), budgeted context (MCP + proxy), auditable selection. Early beta. Shamy on OpenClaw in production.',
};

const valueProps = [
  {
    title: 'Workspace discipline',
    desc: 'Feng Shui (Layer 0) — agents validate where they write before creating mess at ~/Downloads. Harmonize with approval-first moves.',
    icon: (
      <svg className="landing-value-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    title: 'Budgeted context',
    desc: 'MCP selects repo chunks on cold slices (~95% audited savings). Proxy trims chat history on OpenClaw. No more “send the whole thread.”',
    icon: (
      <svg className="landing-value-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Auditable operations',
    desc: 'selections.jsonl logs every MCP pick — tokens in, tokens out, percent saved. Optional Celo telemetry for on-chain stats.',
    icon: (
      <svg className="landing-value-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

const resources = [
  { title: 'Feng Shui', desc: 'Layer 0 — workspace placement before first write', href: '/FENG-SHUI.md' },
  { title: 'SKILL.md', desc: 'Layer 1 — context routing and MCP discipline', href: '/SKILL.md' },
  { title: 'Dashboard', desc: 'Telemetry and topology snapshots', href: '/dashboard' },
  { title: 'Topology', desc: 'Agent graph, RepoGraph, selection stats', href: '/dashboard/topology' },
  { title: 'Architecture', desc: 'Chambers, graphs, the math', href: 'https://github.com/RootRouter/RootRouter/blob/main/docs/architecture.md', external: true },
  { title: 'GitHub', desc: 'Source, demos, insights', href: 'https://github.com/RootRouter/RootRouter', external: true },
];

const footerLinks = [
  { href: '/', label: 'Home' },
  { href: '/FENG-SHUI.md', label: 'Feng Shui' },
  { href: '/SKILL.md', label: 'SKILL.md' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: 'https://github.com/RootRouter/RootRouter', label: 'GitHub', external: true },
];

export default function HomePage() {
  return (
    <>
      <section className="landing-section landing-section-dark">
        <div className="landing-section-inner landing-two-col">
          <div>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--prism-violet)',
                fontFamily: 'var(--font-mono)',
                marginBottom: '0.75rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Early beta · self-hosted
            </p>
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
              The agent operations harness — where they write, what they read, what it costs.
            </h1>
            <p
              style={{
                fontSize: '1.15rem',
                color: 'var(--prism-text-muted)',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
                maxWidth: '30rem',
              }}
            >
              RootRouter disciplines AI agents: Feng Shui for workspace placement, MCP for budgeted repo context,
              proxy for chat trimming. Auditable selection logs. Shamy runs it on OpenClaw today.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <Link href="#agent-onboarding" className="landing-cta-primary">
                Agent onboarding
              </Link>
              <Link href="#proof" className="landing-cta-secondary">
                See evidence
              </Link>
              <Link href="#get-started" className="landing-cta-secondary">
                Pick your path
              </Link>
            </div>
          </div>
          <div className="landing-hero-visual">
            <HeroSnapshotGraphs />
          </div>
        </div>
      </section>

      <AgentOnboardingSection />
      <ProofSection />
      <HowItWorksSection />
      <ShamyProductionSection />

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
            Agents get lost, stuff context, touch the wrong files, and leave no evidence. This fixes the operational layer first.
          </p>
          <div className="landing-value-grid">
            {valueProps.map((item, i) => (
              <div key={i} className="landing-value-card">
                {item.icon}
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--prism-text)', marginBottom: '0.5rem' }}>
                  {item.title}
                </h3>
                <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-panel">
        <div className="landing-section-inner landing-two-col">
          <div>
            <p style={{ fontSize: '1rem', color: 'var(--prism-cyan)', fontFamily: 'var(--font-display)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Optional
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.35rem, 2.2vw, 1.75rem)',
                fontWeight: 600,
                color: 'var(--prism-text)',
                marginBottom: '1rem',
                lineHeight: 1.25,
              }}
            >
              On-chain telemetry on Celo
            </h2>
            <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              Log agent stats to a Solidity contract for verifiable audit trails. ERC-8004 compatible. Not required for
              MCP or proxy — an optional trust layer for swarms and delegation.
            </p>
            <Link href="/dashboard" className="landing-cta-secondary">
              Open dashboard
            </Link>
          </div>
          <div className="landing-hero-visual">
            <div
              className="holo-card-prism"
              style={{
                padding: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--prism-cyan)',
                fontFamily: 'var(--font-display)',
                fontSize: '1.1rem',
                textAlign: 'center',
              }}
            >
              Audit trail · not a security product
            </div>
          </div>
        </div>
      </section>

      <GetStartedSection />

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
            Resources
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
                <p style={{ fontSize: '0.95rem', color: 'var(--prism-text-muted)', lineHeight: 1.4 }}>{r.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-dark">
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
            FAQ
          </h2>
          <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
            Savings, paths, and what RootRouter is not.
          </p>
          <FAQAccordion />
        </div>
      </section>

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
            RootRouter is the nervous system. Shamy is the first body.
          </h2>
          <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.05rem', marginBottom: '1.5rem', maxWidth: '32rem', margin: '0 auto 1.5rem' }}>
            Fetch both playbooks, pick your path, and measure what you save.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/FENG-SHUI.md" className="landing-cta-primary">
              Feng Shui skill
            </Link>
            <Link href="/SKILL.md" className="landing-cta-secondary">
              RootRouter SKILL
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--prism-cyan)', textDecoration: 'none' }}>
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
            Agent operations harness · MotusDAO · Early beta
          </span>
        </div>
      </footer>
    </>
  );
}
