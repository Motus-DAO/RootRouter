import Link from 'next/link';

const flow = [
  'User talks to Shamy (OpenClaw)',
  'Feng Shui — workspace guard before writes',
  'RootRouter proxy trims chat history (rootrouter/* → Venice)',
  'Optional MCP — index_repo + select_context on repo tasks',
  'Topology dashboard — snapshots, RepoGraph, selection stats',
];

export default function ShamyProductionSection() {
  return (
    <section className="landing-section landing-section-darker">
      <div className="landing-section-inner landing-two-col">
        <div>
          <p
            style={{
              fontSize: '1rem',
              color: 'var(--prism-cyan)',
              fontFamily: 'var(--font-display)',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Production proof
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
            Shamy — the first body on the nervous system
          </h2>
          <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.1rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
            RootRouter is credible when a real agent uses it daily: OpenClaw on a VPS, Venice inference, Docker-sidecar
            proxy, Layer 0 + Layer 1 playbooks in the workspace. Not a sorting-algorithm demo.
          </p>
          <ol
            style={{
              color: 'var(--prism-text-muted)',
              fontSize: '1rem',
              lineHeight: 1.75,
              paddingLeft: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            {flow.map((step, i) => (
              <li key={i} style={{ marginBottom: '0.35rem' }}>
                {step}
              </li>
            ))}
          </ol>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link
              href="https://github.com/RootRouter/RootRouter/blob/main/docs/insights/007-openclaw-vps-agent-ux-lessons.md"
              className="landing-cta-secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenClaw deploy lessons
            </Link>
            <Link href="/dashboard/topology" className="landing-cta-secondary">
              View topology
            </Link>
          </div>
        </div>
        <div className="landing-hero-visual">
          <div
            className="holo-card-prism"
            style={{
              padding: '1.5rem',
              position: 'relative',
              zIndex: 1,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              lineHeight: 1.7,
              color: 'var(--prism-text-muted)',
            }}
          >
            <div style={{ color: 'var(--prism-cyan)', marginBottom: '0.75rem' }}>shamy stack</div>
            <div>
              Browser → Caddy
              <br />
              → OpenClaw gateway
              <br />
              → rootrouter-proxy:8797
              <br />
              → Venice API
            </div>
            <div style={{ marginTop: '1rem', color: 'var(--prism-text-dim)' }}>
              AGENTS.md → FENG-SHUI.md + SKILL.md
              <br />
              model: rootrouter/kimi-k2-5
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
