import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { GridScanBackground } from '../components/GridScanBackground';

export const metadata: Metadata = {
  title: 'RootRouter Telemetry Dashboard',
  description: 'Telemetry dashboard for RootRouter on Celo',
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
        <GridScanBackground>{children}</GridScanBackground>
      </body>
    </html>
  );
}
