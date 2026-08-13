'use client';

import React, { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// StageSpinner — micro inline spinner for buttons, actions, inline async states
// Pure CSS, GPU-accelerated, zero framer-motion, zero SVG. ~0.3kb
// ─────────────────────────────────────────────────────────────────────────────
interface StageSpinnerProps {
  size?: number;
  className?: string;
  /** accent | muted | white */
  variant?: 'accent' | 'muted' | 'white';
}

export function StageSpinner({ size = 16, className = '', variant = 'accent' }: StageSpinnerProps) {
  const colorMap = {
    accent: { border: '#00ccff33', arc: '#00ccff' },
    muted:  { border: 'rgba(255,255,255,0.1)', arc: 'rgba(255,255,255,0.4)' },
    white:  { border: 'rgba(255,255,255,0.2)', arc: '#ffffff' },
  };
  const c = colorMap[variant];
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size, height: size, borderRadius: '50%',
        border: `2px solid ${c.border}`,
        borderTopColor: c.arc,
        borderRightColor: c.arc,
        animation: 'stage-spin 0.7s linear infinite',
        willChange: 'transform',
        display: 'inline-block',
      }}
    />
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// StageSkeleton — shimmer placeholder for cards, lists, panels
// Pure CSS shimmer, no JS motion library.
// ─────────────────────────────────────────────────────────────────────────────
interface StageSkeletonProps {
  className?: string;
  variant?: 'line' | 'block' | 'circle';
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

export function StageSkeleton({
  className = '',
  variant = 'line',
  width,
  height,
  rounded,
}: StageSkeletonProps) {
  const defaults = { line: { h: 14, r: '6px' }, block: { h: 80, r: '10px' }, circle: { h: 40, r: '50%' } };
  const d = defaults[variant];
  const w = width  ? (typeof width  === 'number' ? `${width}px`  : width)  : '100%';
  const h = height ? (typeof height === 'number' ? `${height}px` : height) : `${d.h}px`;
  return (
    <span
      aria-hidden="true"
      className={`block ${className}`}
      style={{
        width: w, height: h, borderRadius: rounded ?? d.r,
        background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'stage-shimmer 1.6s ease-in-out infinite',
        willChange: 'background-position',
        display: 'inline-block', flexShrink: 0,
      }}
    />
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// StageLoader — full branded loader for page / section transitions
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes stage-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes stage-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes pm-flow {
    from { stroke-dashoffset: 720; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes pm-logo-glow {
    0%,100%{ fill:var(--sl-brand-default);filter:drop-shadow(0 0 0px transparent);}
    9%     { fill:var(--sl-brand-default);filter:drop-shadow(0 0 0px transparent);}
    18%    { fill:var(--sl-brand-active); filter:drop-shadow(0 0 8px var(--sl-glow-2));}
    28%    { fill:var(--sl-brand-active); filter:drop-shadow(0 0 15px var(--sl-glow-1)) drop-shadow(0 0 30px var(--sl-glow-2));}
    42%    { fill:var(--sl-brand-active); filter:drop-shadow(0 0 12px var(--sl-glow-2));}
    52%    { fill:var(--sl-brand-default);filter:drop-shadow(0 0 0px transparent);}
  }
  @keyframes pm-ring-pulse {
    0%,100%{ opacity:.15; }
    50%    { opacity:.45; }
  }
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.id = 'stage-loader-styles';
  el.textContent = GLOBAL_STYLES;
  document.head.appendChild(el);
  stylesInjected = true;
}

// ── Small — pure CSS, zero SVG overhead ─────────────────────────────────────
function SmallLoader({ text, isDark }: { text?: string; isDark: boolean }) {
  const accent = isDark ? '#00ccff' : '#2563eb';
  const muted  = isDark ? '#a1a1aa' : '#71717a';
  const brand  = isDark ? '#e0f7ff' : '#111827';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ position:'relative', width:40, height:40 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%',
          border:`2px solid ${isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.08)'}` }} />
        <div style={{ position:'absolute', inset:0, borderRadius:'50%',
          border:'2px solid transparent', borderTopColor:accent, borderRightColor:accent,
          animation:'stage-spin 0.9s linear infinite', willChange:'transform' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          width:5, height:5, borderRadius:'50%', background:accent,
          animation:'pm-ring-pulse 1.8s ease-in-out infinite' }} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
        <span style={{ fontFamily:"'Outfit','Inter',sans-serif", fontSize:13, fontWeight:900,
          letterSpacing:4, color:brand }}>STAGE</span>
        {text && (
          <span style={{ fontFamily:"'Outfit','Inter',sans-serif", fontSize:10, fontWeight:600,
            letterSpacing:1.5, color:muted, textTransform:'uppercase' }}>{text}</span>
        )}
      </div>
    </div>
  );
}

// ── Branded SVG (md / lg / xl) ───────────────────────────────────────────────
const TRACES = [
  { d:'M100 300 H250 V120',  g:'sl-tg1', delay:'0s'    },
  { d:'M800 200 H650 V380',  g:'sl-tg2', delay:'1.25s' },
  { d:'M400 520 V380 H250',  g:'sl-tg3', delay:'2.5s'  },
  { d:'M500 50  V120 H650',  g:'sl-tg4', delay:'3.75s' },
] as const;

function BrandedLoader({ pixelSize, text, isDark }: { pixelSize:number; text?:string; isDark:boolean }) {
  return (
    <div style={{
      width:pixelSize, height:pixelSize,
      '--sl-bg-frame'     : isDark ? '#09090b' : '#ffffff',
      '--sl-bg-header'    : isDark ? '#18181b' : '#f4f4f5',
      '--sl-border'       : isDark ? '#27272a' : '#e4e4e7',
      '--sl-text'         : isDark ? '#a1a1aa' : '#71717a',
      '--sl-brand-default': isDark ? '#18181b' : '#e4e4e7',
      '--sl-brand-active' : isDark ? '#e0f7ff' : '#2563eb',
      '--sl-glow-1'       : isDark ? 'rgba(0,204,255,0.95)'  : 'rgba(37,99,235,0.6)',
      '--sl-glow-2'       : isDark ? 'rgba(0,204,255,0.5)'   : 'rgba(37,99,235,0.3)',
      '--sl-trace'        : isDark ? '#00ccff' : '#2563eb',
    } as React.CSSProperties}>
      <svg viewBox="80 220 740 520" xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ width:'100%', height:'100%', overflow:'visible' }}>
        <defs>
          {(['sl-tg1','sl-tg2','sl-tg3','sl-tg4'] as const).map((id,i) => (
            <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse"
              x1={[250,650,250,650][i]} y1={[120,120,380,120][i]}
              x2={[100,800,400,500][i]} y2={[200,300,400,100][i]}>
              <stop offset="0%"   stopColor="var(--sl-trace)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--sl-trace)" stopOpacity="0.4" />
            </linearGradient>
          ))}
        </defs>

        {/* Browser frame */}
        <g transform="translate(0,200)">
          <rect x="250" y="120" width="400" height="260" rx="12"
            style={{ fill:'var(--sl-bg-frame)', stroke:'var(--sl-border)', strokeWidth:1.5,
              filter:`drop-shadow(0 10px 30px ${isDark?'rgba(0,0,0,0.7)':'rgba(0,0,0,0.08)'})`}} />
          <rect x="250" y="120" width="400" height="36" rx="12"
            style={{ fill:'var(--sl-bg-header)' }} />
          <circle cx="275" cy="138" r="5" fill="#ef4444" />
          <circle cx="295" cy="138" r="5" fill="#eab308" />
          <circle cx="315" cy="138" r="5" fill="#22c55e" />
          <text x="450" y="143" textAnchor="middle" style={{
            fontFamily:"'Outfit','Inter',sans-serif", fontSize:13, fontWeight:700,
            letterSpacing:2, fill:'var(--sl-text)', textTransform:'uppercase' }}>
            {text ? text.toUpperCase() : 'CONNECTING...'}
          </text>
          <text x="450" y="278" textAnchor="middle" style={{
            fontFamily:"'Outfit','Inter',sans-serif", fontSize:34, fontWeight:900,
            letterSpacing:5, fill:'var(--sl-brand-default)',
            animation:'pm-logo-glow 5s cubic-bezier(0.4,0,0.2,1) infinite',
            willChange:'filter,fill' }}>
            STAGE
          </text>
        </g>

        {/* Traces — staggered flow */}
        <g transform="translate(0,200)">
          {TRACES.map(({ d, g, delay }, i) => (
            <path key={i} d={d} stroke={`url(#${g})`} fill="none"
              strokeWidth="1.5" strokeLinejoin="round"
              strokeDasharray="120 600" strokeDashoffset="720"
              style={{
                animation:`pm-flow 5s linear infinite`,
                animationDelay:delay,
                willChange:'stroke-dashoffset',
                filter:`drop-shadow(0 0 6px var(--sl-trace))`,
                opacity:0.95,
              }} />
          ))}
        </g>
      </svg>
    </div>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
interface StageLoaderProps {
  /** sm = tiny ring (panels/sidebars) | md = section loader | lg/xl = full screen */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  fullPage?: boolean;
  text?: string;
  /** Override theme detection */
  dark?: boolean;
}

export function StageLoader({
  size = 'md',
  className = '',
  fullPage = false,
  text,
  dark,
}: StageLoaderProps) {
  const [isDark, setIsDark] = useState(dark ?? true);

  useEffect(() => {
    injectStyles();
    if (dark !== undefined) { setIsDark(dark); return; }
    import('@/store/themeStore').then(({ useThemeStore }) => {
      setIsDark(useThemeStore.getState().resolvedTheme === 'dark');
      const unsub = useThemeStore.subscribe((s) => setIsDark(s.resolvedTheme === 'dark'));
      return unsub;
    });
  }, [dark]);

  const sizeMap = { sm: 0, md: 200, lg: 340, xl: 480 };
  const isSmall   = size === 'sm';
  const pixelSize = isSmall ? 0 : (typeof size === 'number' ? size : (sizeMap[size as keyof typeof sizeMap] ?? 200));

  const inner = (
    <div className={className} style={isSmall ? {} : { width: pixelSize, height: pixelSize }}>
      {isSmall
        ? <SmallLoader text={text} isDark={isDark} />
        : <BrandedLoader pixelSize={pixelSize} text={text} isDark={isDark} />
      }
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        position:'fixed', inset:0, zIndex:9999,
        display:'flex', alignItems:'center', justifyContent:'center',
        background: isDark ? 'rgba(3,3,3,0.95)' : 'rgba(248,250,252,0.95)',
        backdropFilter:'blur(12px)',
      }}>
        {inner}
      </div>
    );
  }

  return inner;
}

