'use client';

/** Syntax colors: .code-kw (violet), .code-ty (cyan), .code-str (amber), .code-comment (dim) */
const codeCls = {
  kw: { color: 'var(--prism-violet)' },
  ty: { color: 'var(--prism-cyan)' },
  str: { color: 'var(--prism-amber)' },
  comment: { color: 'var(--prism-text-dim)', fontStyle: 'italic' as const },
};

export default function GetStartedSection() {
  return (
    <section className="landing-section landing-section-panel">
      <div className="landing-section-inner" style={{ maxWidth: '720px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.35rem, 2.2vw, 1.65rem)',
            fontWeight: 600,
            color: 'var(--prism-text)',
            marginBottom: '0.5rem',
          }}
        >
          How do I get started?
        </h2>
        <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
          Install the package, set .env with your LLM and Celo credentials, then wrap your chat calls with router.chat(). Run the demos (npx tsx demo/basic.ts or demo/benchmark.ts) offline, or open the Dashboard and load telemetry from an agent address on Celo.
        </p>
        <div className="holo-terminal-prism">
          <div className="holo-terminal-header">
            <div className="holo-terminal-dots">
              <span className="holo-terminal-dot holo-terminal-dot-red" aria-hidden />
              <span className="holo-terminal-dot holo-terminal-dot-amber" aria-hidden />
              <span className="holo-terminal-dot holo-terminal-dot-cyan" aria-hidden />
            </div>
            <span className="holo-terminal-filename">get-started.ts</span>
          </div>
          <pre style={{ margin: 0, padding: '1rem 1.25rem', overflowX: 'auto' }}>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', lineHeight: 1.65, whiteSpace: 'pre' }}>
              <span style={codeCls.comment}># Install</span>
              {'\n'}
              <span style={codeCls.ty}>npm install rootrouter</span>
              {'\n\n'}
              <span style={codeCls.comment}># Usage (set OPENROUTER_KEY, CELO_RPC_URL, etc. in .env)</span>
              {'\n'}
              <span style={codeCls.kw}>import</span> {' { '}
              <span style={codeCls.ty}>RootRouter</span>
              {' } '}
              <span style={codeCls.kw}>from</span> <span style={codeCls.str}>&apos;rootrouter&apos;</span>;
              {'\n\n'}
              <span style={codeCls.kw}>const</span> router = <span style={codeCls.kw}>new</span> <span style={codeCls.ty}>RootRouter</span>({'{\n  '}
              llmBaseUrl: <span style={codeCls.str}>&apos;https://openrouter.ai/api/v1&apos;</span>,
              {'\n  '}
              llmApiKey: process.env.OPENROUTER_KEY,
              {'\n  '}
              celoRpcUrl: process.env.CELO_RPC_URL,
              {'\n  '}
              celoPrivateKey: process.env.CELO_PRIVATE_KEY,
              {'\n  '}
              telemetryContractAddress: process.env.TELEMETRY_CONTRACT_ADDRESS,
              {'\n}'}
              );
              {'\n\n'}
              <span style={codeCls.kw}>const</span> result = <span style={codeCls.kw}>await</span> router.
              <span style={codeCls.ty}>chat</span>({'{\n  '}
              agentId: <span style={codeCls.str}>&apos;my-agent&apos;</span>,
              {'\n  '}
              messages: [{'{ '}role: <span style={codeCls.str}>&apos;user&apos;</span>, content: <span style={codeCls.str}>&apos;Write a sorting algorithm&apos;</span> {'}'}],
              {'\n}'}
              );
              {'\n\n'}
              console.log(result.response);
              {'\n'}
              console.log(<span style={codeCls.str}>{'`Saved ${result.telemetry.tokensSaved} tokens`'}</span>);
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
