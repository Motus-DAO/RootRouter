import {
  evidenceMetrics,
  methodLabels,
  realApiBenchmark,
  type EvidenceMethod,
} from '../lib/landing-metrics';

const methodColors: Record<EvidenceMethod, { bg: string; border: string; text: string }> = {
  audited: { bg: 'rgba(0, 255, 204, 0.12)', border: 'rgba(0, 255, 204, 0.35)', text: 'var(--prism-cyan)' },
  production: { bg: 'rgba(120, 200, 120, 0.12)', border: 'rgba(0, 200, 120, 0.35)', text: '#8fd4a0' },
  simulated: { bg: 'rgba(255, 180, 80, 0.12)', border: 'rgba(255, 180, 80, 0.35)', text: 'var(--prism-amber)' },
  'live-api': { bg: 'rgba(100, 140, 255, 0.12)', border: 'rgba(100, 140, 255, 0.35)', text: '#9eb8ff' },
};

export default function ProofSection() {
  return (
    <section className="landing-section landing-section-panel" id="proof">
      <div className="landing-section-inner">
        <p
          style={{
            fontSize: '1rem',
            color: 'var(--prism-cyan)',
            fontFamily: 'var(--font-display)',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: 'center',
          }}
        >
          Evidence
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.35rem, 2.2vw, 1.65rem)',
            fontWeight: 600,
            color: 'var(--prism-text)',
            textAlign: 'center',
            marginBottom: '0.75rem',
          }}
        >
          Segmented savings — by path, not one headline number
        </h2>
        <p
          style={{
            color: 'var(--prism-text-muted)',
            fontSize: '1.05rem',
            lineHeight: 1.65,
            textAlign: 'center',
            maxWidth: '42rem',
            margin: '0 auto 2rem',
          }}
        >
          MCP repo selection, proxy chat trimming, and the SDK demo measure different things. We label each method so
          claims stay provable.
        </p>

        <div className="landing-value-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {evidenceMetrics.map((m) => {
            const colors = methodColors[m.method];
            return (
              <div key={m.id} className="landing-value-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--prism-radius-sm)',
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {methodLabels[m.method]}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--prism-text-dim)' }}>{m.path}</span>
                </div>
                <div className="landing-stat-value" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
                  {m.value}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', color: 'var(--prism-text)', marginBottom: '0.5rem' }}>
                  {m.label}
                </div>
                <p style={{ color: 'var(--prism-text-muted)', fontSize: '0.95rem', lineHeight: 1.55, marginBottom: '0.5rem' }}>
                  {m.detail}
                </p>
                {m.footnote && (
                  <p style={{ color: 'var(--prism-text-dim)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>{m.footnote}</p>
                )}
              </div>
            );
          })}
        </div>

        {realApiBenchmark.status === 'complete' && (
          <div
            className="holo-card-prism"
            style={{
              marginTop: '2rem',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ flex: '1 1 16rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--prism-radius-sm)',
                    background: methodColors['live-api'].bg,
                    border: `1px solid ${methodColors['live-api'].border}`,
                    color: methodColors['live-api'].text,
                  }}
                >
                  Live API
                </span>
                <span style={{ color: 'var(--prism-text-muted)', fontSize: '0.9rem' }}>{realApiBenchmark.provider}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-display)', color: 'var(--prism-text)', margin: '0 0 0.35rem' }}>
                {realApiBenchmark.headline}
              </p>
              <p style={{ color: 'var(--prism-text-muted)', fontSize: '0.95rem', lineHeight: 1.55, margin: 0 }}>
                {realApiBenchmark.description}
              </p>
            </div>
            {'resultUrl' in realApiBenchmark && realApiBenchmark.resultUrl && (
              <a
                href={realApiBenchmark.resultUrl}
                className="landing-cta-secondary"
                target="_blank"
                rel="noopener noreferrer"
                style={{ flexShrink: 0 }}
              >
                nim-latest.json →
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
