'use client';

import React from 'react';
import { GridScan } from './GridScan';

type GridScanBackgroundProps = {
  children: React.ReactNode;
};

/**
 * Full-viewport GridScan background. Renders the grid behind the app content.
 */
export function GridScanBackground({ children }: GridScanBackgroundProps) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      {/* Background layer: behind everything so use negative z-index */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          minHeight: '100%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor="#392e4e"
          gridScale={0.1}
          scanColor="#FF9FFC"
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
          />
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 0 }}>{children}</div>
    </div>
  );
}
