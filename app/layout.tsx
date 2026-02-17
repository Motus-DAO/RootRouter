import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { GridScanBackground } from '../components/GridScanBackground';
import AppNav from '../components/AppNav';
import ConvexClientProvider from '../components/ConvexClientProvider';

export const metadata: Metadata = {
  title: { default: 'RootRouter', template: '%s — RootRouter' },
  description: 'Algebraic Agent Infrastructure for AI Swarms. Telemetry and dashboard on Celo.',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          color: 'var(--prism-text)',
          fontFamily: 'var(--font-body)',
          minHeight: '100vh',
        }}
      >
        <GridScanBackground>
          <ConvexClientProvider>
            <AppNav />
            {children}
          </ConvexClientProvider>
        </GridScanBackground>
      </body>
    </html>
  );
}
