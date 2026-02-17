'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/topology', label: 'Topology' },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        borderBottom: '1px solid var(--prism-border)',
        padding: '0.75rem 1.25rem',
        marginBottom: 0,
        background: 'rgba(10, 10, 20, 0.4)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--prism-cyan)',
            textDecoration: 'none',
            marginRight: '1.5rem',
          }}
        >
          🌿 RootRouter
        </Link>
        {navItems.map(({ href, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--prism-radius-sm)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-display)',
                textDecoration: 'none',
                color: isActive ? 'var(--prism-cyan)' : 'var(--prism-text-muted)',
                background: isActive ? 'rgba(0, 255, 204, 0.12)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(0, 255, 204, 0.35)' : 'transparent'}`,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
