'use client';

import React from 'react';

/**
 * Ultra-performant, GPU-accelerated ambient pastel background.
 * Eliminates all heavy 3D backdrop-blur calculations and pointer-move re-render thrashing.
 * Pure CSS hardware acceleration with zero JS main-thread load.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
    >
      {/* Soft warm paper base texture / subtle atmospheric glow */}
      <div 
        className="absolute top-[-10%] left-[-5%] w-[65vw] h-[55vh] rounded-full opacity-60 dark:opacity-20 blur-[120px] will-change-transform transform-gpu animate-ambient-drift-1"
        style={{
          background: 'radial-gradient(circle, rgba(252, 231, 228, 0.8) 0%, rgba(254, 243, 226, 0.4) 50%, transparent 80%)'
        }}
      />
      
      <div 
        className="absolute top-[15%] right-[-10%] w-[55vw] h-[60vh] rounded-full opacity-50 dark:opacity-15 blur-[130px] will-change-transform transform-gpu animate-ambient-drift-2"
        style={{
          background: 'radial-gradient(circle, rgba(236, 230, 246, 0.75) 0%, rgba(235, 241, 254, 0.4) 60%, transparent 80%)'
        }}
      />

      <div 
        className="absolute top-[50%] left-[10%] w-[50vw] h-[50vh] rounded-full opacity-40 dark:opacity-10 blur-[140px] will-change-transform transform-gpu animate-ambient-drift-3"
        style={{
          background: 'radial-gradient(circle, rgba(230, 244, 234, 0.7) 0%, rgba(252, 231, 228, 0.3) 60%, transparent 80%)'
        }}
      />

      {/* Subtle fine film grain overlay for editorial organic paper tactile feel */}
      <div 
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] mix-blend-multiply dark:mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export default AmbientBackground;
