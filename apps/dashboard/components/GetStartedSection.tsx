'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';

type TabId = 'hermes' | 'openclaw' | 'cursor' | 'codex' | 'sdk';

const codeCls = {
  kw: { color: 'var(--prism-violet)' },
  ty: { color: 'var(--prism-cyan)' },
  str: { color: 'var(--prism-amber)' },
  comment: { color: 'var(--prism-text-dim)', fontStyle: 'italic' as const },
};

const iconWrap: React.CSSProperties = {
  width: 18,
  height: 18,
  display: 'inline-flex',
  flexShrink: 0,
};

function IconHermes() {
  return (
    <svg style={iconWrap} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#3B82F6" />
      <path
        fill="#fff"
        d="M7.5 15.5c1.2-2.8 2.6-4.2 4.5-4.2s3.3 1.4 4.5 4.2c-1.1.9-2.7 1.5-4.5 1.5s-3.4-.6-4.5-1.5z"
      />
      <circle cx="12" cy="9.2" r="2.4" fill="#fff" />
      <path
        fill="none"
        stroke="#93C5FD"
        strokeWidth="1.4"
        strokeLinecap="round"
        d="M5 7.5c2-.8 4-.8 7 1.2M19 7.5c-2-.8-4-.8-7 1.2"
      />
    </svg>
  );
}

function IconOpenClaw() {
  return (
    <svg style={iconWrap} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#DC2626" />
      <path
        fill="#fff"
        d="M8 6.5c0 2.2-1.2 3.8-1.2 5.6 0 2.8 2.3 5 5.2 5s5.2-2.2 5.2-5c0-1.8-1.2-3.4-1.2-5.6-.9 1.1-2.2 1.8-4 1.8S8.9 7.6 8 6.5z"
      />
      <path fill="#FECACA" d="M10.2 16.2h3.6l-.7 2.3h-2.2z" />
    </svg>
  );
}

function IconCursor() {
  return (
    <svg style={iconWrap} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#171717" />
      <path
        fill="#E8E8E8"
        d="M7.2 5.4 16.8 12l-5.1 1.4-2.2 5.2L7.2 5.4z"
      />
      <path fill="#A3A3A3" d="M11.7 13.4 16.8 12l-5.1 1.4z" />
    </svg>
  );
}

function IconCodex() {
  return (
    <svg style={iconWrap} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#10A37F" />
      <path
        fill="#fff"
        d="M12 5.2c-2.3 0-3.6 1.5-3.6 3.4 0 1.3.7 2.4 1.8 3.1-.9.6-1.5 1.6-1.5 2.8 0 2 1.5 3.3 3.3 3.3s3.3-1.3 3.3-3.3c0-1.2-.6-2.2-1.5-2.8 1.1-.7 1.8-1.8 1.8-3.1 0-1.9-1.3-3.4-3.6-3.4zm0 1.6c1.2 0 1.9.8 1.9 1.8S13.2 10.4 12 10.4s-1.9-.8-1.9-1.8.7-1.8 1.9-1.8zm0 6.2c1.1 0 1.8.7 1.8 1.7S13.1 16.4 12 16.4s-1.8-.7-1.8-1.7.7-1.7 1.8-1.7z"
      />
    </svg>
  );
}

function IconSdk() {
  return (
    <svg style={iconWrap} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#0F766E" />
      <path
        fill="#5EEAD4"
        d="M12 4.5c.4 2.4 1.6 4 3.8 5.2-2.2 1.1-3.4 2.8-3.8 5.3-.4-2.5-1.6-4.2-3.8-5.3C10.4 8.5 11.6 6.9 12 4.5z"
      />
      <path
        fill="#99F6E4"
        d="M7.2 15.2c.3 1.4.9 2.3 2.1 3-.1.9-.5 1.6-1.2 2.2-.6-.7-1-1.5-1.1-2.5-.8-.4-1.4-1.1-1.7-2 1.1.1 1.8-.1 1.9-.7zm9.6 0c.1.6.8.8 1.9.7-.3.9-.9 1.6-1.7 2-.1 1-.5 1.8-1.1 2.5-.7-.6-1.1-1.3-1.2-2.2 1.2-.7 1.8-1.6 2.1-3z"
      />
    </svg>
  );
}

const tabs: { id: TabId; label: string; icon: () => ReactNode }[] = [
  { id: 'hermes', label: 'Hermes', icon: IconHermes },
  { id: 'openclaw', label: 'OpenClaw / Shamy', icon: IconOpenClaw },
  { id: 'cursor', label: 'Cursor', icon: IconCursor },
  { id: 'codex', label: 'Codex', icon: IconCodex },
  { id: 'sdk', label: 'SDK', icon: IconSdk },
];

function HermesPanel() {
  return (
    <pre style={{ margin: 0, padding: '1rem 1.25rem', overflowX: 'auto' }}>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre' }}>
        <span style={codeCls.comment}># Persona store (one file for the COO)</span>
        {'\n'}
        {'~/.rootrouter/hermes-coo/proxy-store.json'}
        {'\n\n'}
        <span style={codeCls.comment}># Point Hermes at RootRouter + project scope</span>
        {'\n'}
        npx rootrouter@beta init hermes
        {'\n\n'}
        <span style={codeCls.comment}># Header scopes recall inside that store:</span>
        {'\n'}
        x-rootrouter-agent-id: hermes-coo:&lt;project-slug&gt;
        {'\n\n'}
        <span style={codeCls.comment}># Only after Hermes project_switch (workspace change)</span>
        {'\n'}
        <span style={codeCls.comment}># — not when you just talk about another product</span>
        {'\n'}
        rootrouter init hermes · then /new
      </code>
    </pre>
  );
}

function OpenClawPanel() {
  return (
    <pre style={{ margin: 0, padding: '1rem 1.25rem', overflowX: 'auto' }}>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre' }}>
        <span style={codeCls.comment}># Shamy (OpenClaw agent) — proxy on Docker network</span>
        {'\n'}
        {'"rootrouter": {\n  '}
        <span style={codeCls.str}>&quot;baseUrl&quot;</span>: <span style={codeCls.str}>&quot;http://rootrouter-proxy:8797/api/v1&quot;</span>,
        {'\n  '}
        <span style={codeCls.str}>&quot;apiKey&quot;</span>: <span style={codeCls.str}>&quot;{'${VENICE_API_KEY}'}&quot;</span>
        {'\n}'}
        {'\n\n'}
        <span style={codeCls.comment}># Model + persona scope (init openclaw coming next)</span>
        {'\n'}
        rootrouter/kimi-k2-5
        {'\n'}
        x-rootrouter-agent-id: openclaw-shamy:&lt;project&gt;
        {'\n\n'}
        <span style={codeCls.comment}># VPS setup</span>
        {'\n'}
        bash ~/RootRouter/scripts/setup-openclaw-venice-shamy.sh
        {'\n\n'}
        curl -s https://rootrouter.motusdao.org/FENG-SHUI.md
        {'\n'}
        curl -s https://rootrouter.motusdao.org/SKILL.md
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
        <span style={codeCls.comment}># Then read spec + anchors selection missed</span>
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

function CodexPanel() {
  return (
    <pre style={{ margin: 0, padding: '1rem 1.25rem', overflowX: 'auto' }}>
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre' }}>
        <span style={codeCls.comment}># Per-project MCP store + AGENTS.md</span>
        {'\n'}
        npx rootrouter@beta init codex --project-store --write-agents-md --local-embeddings
        {'\n\n'}
        <span style={codeCls.comment}># Store</span>
        {'\n'}
        {'~/.rootrouter/<project-slug>/codex-store.json'}
        {'\n\n'}
        <span style={codeCls.comment}># Optional proxy (do not share with MCP store by accident)</span>
        {'\n'}
        export ROOTROUTER_STORE_PATH=...
        {'\n'}
        npx -p @rootrouter/proxy@beta rootrouter-proxy
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
        <span style={codeCls.comment}># Live API (NVIDIA NIM — .env.local)</span>
        {'\n'}
        npm run demo:benchmark-live -- --queries 12
        {'\n\n'}
        <span style={codeCls.comment}># Offline simulated demo</span>
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
  hermes: HermesPanel,
  openclaw: OpenClawPanel,
  cursor: CursorPanel,
  codex: CodexPanel,
  sdk: SdkPanel,
};

const descByTab: Record<TabId, string> = {
  hermes:
    'Your COO across products. One persona store; scope changes only when you switch a Hermes Project workspace — not when you chat about MotusDAO vs Avril in the same project.',
  openclaw:
    'Shamy on OpenClaw: point baseUrl at the proxy for passive chat trim. Add MCP for repo slices. Same persona+project header pattern as Hermes.',
  cursor:
    'MCP on cold slices only — shaped select_context queries, not “read everything”. ~96% context savings against the full indexed-corpus baseline in the persisted audit example.',
  codex:
    'Per-repo MCP via init codex --project-store. AGENTS.md carries agentId + store path for cold-slice workflows.',
  sdk:
    'Programmatic RootRouter.chat() or offline demos. Live API: npm run demo:benchmark-live (NVIDIA NIM). Offline: demo:benchmark uses simulated LLM.',
};

export default function GetStartedSection() {
  const [tab, setTab] = useState<TabId>('hermes');
  const Panel = panelByTab[tab];
  const filenames: Record<TabId, string> = {
    hermes: 'init-hermes.md',
    openclaw: 'openclaw-shamy.md',
    cursor: 'cursor-mcp.md',
    codex: 'init-codex.md',
    sdk: 'sdk.ts',
  };

  return (
    <section className="landing-section landing-section-panel" id="get-started">
      <div className="landing-section-inner" style={{ maxWidth: '880px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.35rem, 2.2vw, 1.65rem)',
            fontWeight: 600,
            color: 'var(--prism-text)',
            marginBottom: '0.5rem',
          }}
        >
          Plug into your agent
        </h2>
        <p style={{ color: 'var(--prism-text-muted)', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
          {descByTab[tab]}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem',
            marginBottom: '1rem',
            padding: '0.35rem',
            borderRadius: '999px',
            border: '1px solid var(--prism-border)',
            background: 'rgba(0,0,0,0.25)',
            width: 'fit-content',
            maxWidth: '100%',
          }}
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                  color: active ? 'var(--prism-text)' : 'var(--prism-text-muted)',
                  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: active ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
                }}
              >
                <Icon />
                {t.label}
              </button>
            );
          })}
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
