'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';

type TabId = 'openclaw' | 'cursor' | 'sdk';

const codeCls = {
  kw: { color: 'var(--prism-violet)' },
  ty: { color: 'var(--prism-cyan)' },
  str: { color: 'var(--prism-amber)' },
  comment: { color: 'var(--prism-text-dim)', fontStyle: 'italic' as const },
};

const tabs: { id: TabId; label: string }[] = [
  { id: 'openclaw', label: 'OpenClaw / Shamy' },
  { id: 'cursor', label: 'Cursor MCP' },
  { id: 'sdk', label: 'SDK' },
];

function OpenClawPanel() {
  return (
    <pre style={{ margin: 0, padding: '1rem 1.25rem', overflowX: 'auto' }}>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre' }}>
        <span style={codeCls.comment}># 1. Fetch playbooks (Layer 0 then Layer 1)</span>
        {'\n'}
        curl -s https://rootrouter.motusdao.org/FENG-SHUI.md
        {'\n'}
        curl -s https://rootrouter.motusdao.org/SKILL.md
        {'\n\n'}
        <span style={codeCls.comment}># 2. openclaw.json — proxy on same Docker network</span>
        {'\n'}
        {'"rootrouter": {\n  '}
        <span style={codeCls.str}>&quot;baseUrl&quot;</span>: <span style={codeCls.str}>&quot;http://rootrouter-proxy:8797/api/v1&quot;</span>,
        {'\n  '}
        <span style={codeCls.str}>&quot;apiKey&quot;</span>: <span style={codeCls.str}>&quot;{'${VENICE_API_KEY}'}&quot;</span>
        {'\n}'}
        {'\n\n'}
        <span style={codeCls.comment}># 3. Agent model</span>
        {'\n'}
        rootrouter/kimi-k2-5
        {'\n\n'}
        <span style={codeCls.comment}># Setup script on VPS</span>
        {'\n'}
        bash ~/RootRouter/scripts/setup-openclaw-venice-shamy.sh
      </code>
    </pre>
  );
}

function CursorPanel() {
  return (
    <pre style={{ margin: 0, padding: '1rem 1.25rem', overflowX: 'auto' }}>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre' }}>
        <span style={codeCls.comment}># Cold slice — once per repo kickoff</span>
        {'\n'}
        index_repo(path=repo_root)
        {'\n'}
        select_context(
        {'\n  '}
        query=<span style={codeCls.str}>&quot;slice name + modules + anchor files&quot;</span>,
        {'\n  '}
        tokenBudget=<span style={codeCls.ty}>2500</span>
        {'\n'})
        {'\n\n'}
        <span style={codeCls.comment}># Then read spec + anchor files selection missed</span>
        {'\n\n'}
        <span style={codeCls.comment}># Warm follow-up on known files → skip MCP</span>
        {'\n\n'}
        <span style={codeCls.comment}># Handoff</span>
        {'\n'}
        stats() · list_selections()
      </code>
    </pre>
  );
}

function SdkPanel() {
  return (
    <pre style={{ margin: 0, padding: '1rem 1.25rem', overflowX: 'auto' }}>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre' }}>
        <span style={codeCls.comment}># Install</span>
        {'\n'}
        <span style={codeCls.ty}>npm install rootrouter</span>
        {'\n\n'}
        <span style={codeCls.comment}># Simulated benchmark (not live API)</span>
        {'\n'}
        npm run demo:benchmark -- --seed 42
        {'\n\n'}
        <span style={codeCls.kw}>import</span> {'{ '}
        <span style={codeCls.ty}>RootRouter</span>
        {' } '}
        <span style={codeCls.kw}>from</span> <span style={codeCls.str}>&apos;rootrouter&apos;</span>;
        {'\n\n'}
        <span style={codeCls.kw}>const</span> router = <span style={codeCls.kw}>new</span> <span style={codeCls.ty}>RootRouter</span>({'{ /* llm + optional celo */ }'});
        {'\n'}
        <span style={codeCls.kw}>await</span> router.<span style={codeCls.ty}>chat</span>({'{ agentId, messages }'});
      </code>
    </pre>
  );
}

const panelByTab: Record<TabId, () => ReactNode> = {
  openclaw: OpenClawPanel,
  cursor: CursorPanel,
  sdk: SdkPanel,
};

const descByTab: Record<TabId, string> = {
  openclaw:
    'Passive savings: point OpenClaw at the proxy. Active repo work: add @rootrouter/mcp. Run setup-openclaw-venice-shamy.sh for newborn Shamy onboarding.',
  cursor:
    'MCP on cold slices only — shaped select_context queries, not “read everything”. ~95% context savings vs full-repo baseline on audited slice kickoffs.',
  sdk:
    'Programmatic RootRouter.chat() or offline demos. demo:benchmark uses simulated LLM — real API numbers (NVIDIA NIM) will publish separately.',
};

export default function GetStartedSection() {
  const [tab, setTab] = useState<TabId>('openclaw');
  const Panel = panelByTab[tab];
  const filenames: Record<TabId, string> = {
    openclaw: 'openclaw-shamy.md',
    cursor: 'cursor-mcp.md',
    sdk: 'sdk.ts',
  };

  return (
    <section className="landing-section landing-section-panel" id="get-started">
      <div className="landing-section-inner" style={{ maxWidth: '800px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.35rem, 2.2vw, 1.65rem)',
            fontWeight: 600,
            color: 'var(--prism-text)',
            marginBottom: '0.5rem',
          }}
        >
          Pick your path
        </h2>
        <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
          {descByTab[tab]}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--prism-radius-sm)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-display)',
                cursor: 'pointer',
                color: tab === t.id ? 'var(--prism-cyan)' : 'var(--prism-text-muted)',
                background: tab === t.id ? 'rgba(0, 255, 204, 0.12)' : 'transparent',
                border: `1px solid ${tab === t.id ? 'rgba(0, 255, 204, 0.35)' : 'var(--prism-border)'}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="holo-terminal-prism">
          <div className="holo-terminal-header">
            <div className="holo-terminal-dots">
              <span className="holo-terminal-dot holo-terminal-dot-red" aria-hidden />
              <span className="holo-terminal-dot holo-terminal-dot-amber" aria-hidden />
              <span className="holo-terminal-dot holo-terminal-dot-cyan" aria-hidden />
            </div>
            <span className="holo-terminal-filename">{filenames[tab]}</span>
          </div>
          <Panel />
        </div>

        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--prism-text-dim)' }}>
          Playbooks:{' '}
          <Link href="/FENG-SHUI.md" style={{ color: 'var(--prism-cyan)' }}>
            FENG-SHUI.md
          </Link>{' '}
          ·{' '}
          <Link href="/SKILL.md" style={{ color: 'var(--prism-cyan)' }}>
            SKILL.md
          </Link>{' '}
          ·{' '}
          <Link href="/dashboard" style={{ color: 'var(--prism-cyan)' }}>
            Dashboard
          </Link>
        </p>
      </div>
    </section>
  );
}
