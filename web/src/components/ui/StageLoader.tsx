'use client';

import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useThemeStore } from '@/store/themeStore';

interface StageLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  fullPage?: boolean;
  text?: string;
}

export function StageLoader({
  size = 'md',
  className = '',
  fullPage = false,
  text,
}: StageLoaderProps) {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const isDark = resolvedTheme === 'dark';
  const rawShouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shouldReduceMotion = mounted ? rawShouldReduceMotion : false;

  // Map string size to px
  const sizeMap = {
    sm: 100,
    md: 280,
    lg: 460,
    xl: 640,
  };
  const pixelSize = typeof size === 'number' ? size : sizeMap[size] || 280;

  const content = (
    <div 
      className={`pm-loader-container ${isDark ? 'dark' : 'light'} ${className}`} 
      style={{ width: pixelSize, height: pixelSize }}
    >
      <style>{`
        .pm-loader-container {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          
          /* Theme Variables - Light Mode (Default) */
          --pm-loader-bg-frame: #ffffff;
          --pm-loader-bg-header: #f4f4f5;
          --pm-loader-border: #e4e4e7;
          --pm-loader-text: #71717a;
          --pm-loader-brand-default: #e4e4e7;
          --pm-loader-brand-active: #2563eb;
          --pm-loader-brand-glow-1: rgba(37, 99, 235, 0.6);
          --pm-loader-brand-glow-2: rgba(37, 99, 235, 0.3);
          --pm-loader-trace-color: #2563eb;
        }

        .pm-loader-container.dark {
          /* Theme Variables - Dark Mode */
          --pm-loader-bg-frame: #09090b;
          --pm-loader-bg-header: #18181b;
          --pm-loader-border: #27272a;
          --pm-loader-text: #a1a1aa;
          --pm-loader-brand-default: #18181b;
          --pm-loader-brand-active: #e0f7ff;
          --pm-loader-brand-glow-1: rgba(0, 204, 255, 0.95);
          --pm-loader-brand-glow-2: rgba(0, 204, 255, 0.5);
          --pm-loader-trace-color: #00ccff;
        }

        .pm-loader-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .pm-loader-browser-frame {
          fill: var(--pm-loader-bg-frame);
          stroke: var(--pm-loader-border);
          stroke-width: 1.5;
          filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.08));
          transition: fill 0.3s ease, stroke 0.3s ease;
        }

        .pm-loader-container.dark .pm-loader-browser-frame {
          filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.7));
        }

        .pm-loader-browser-top {
          fill: var(--pm-loader-bg-header);
          transition: fill 0.3s ease;
        }

        .pm-loader-dot {
          fill: #3f3f46;
        }

        .pm-loader-text {
          font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2px;
          fill: var(--pm-loader-text);
          transition: fill 0.3s ease;
        }

        .pm-loader-brand {
          font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
          font-size: 34px;
          font-weight: 900;
          letter-spacing: 5px;
          fill: var(--pm-loader-brand-default);
          transition: fill 0.3s ease;
          animation: pm-logo-glow 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .pm-loader-trace-flow {
          stroke-width: 1.5;
          fill: none;
          stroke-dasharray: 120 600;
          stroke-dashoffset: 720;
          animation: pm-flow 5s linear infinite;
          opacity: 0.95;
          stroke-linejoin: round;
          filter: drop-shadow(0 0 8px var(--pm-loader-trace-color)) blur(0.3px);
          color: var(--pm-loader-trace-color);
          transition: color 0.3s ease;
        }

        .pm-loader-trace-flow:nth-child(1) {
          stroke: url(#pm-traceGradient1);
        }
        .pm-loader-trace-flow:nth-child(2) {
          stroke: url(#pm-traceGradient2);
        }
        .pm-loader-trace-flow:nth-child(3) {
          stroke: url(#pm-traceGradient3);
        }
        .pm-loader-trace-flow:nth-child(4) {
          stroke: url(#pm-traceGradient4);
        }

        @keyframes pm-flow {
          from {
            stroke-dashoffset: 720;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes pm-logo-glow {
          0% {
            fill: var(--pm-loader-brand-default);
            filter: drop-shadow(0 0 0px rgba(0, 0, 0, 0));
          }
          9% { /* ~0.45s */
            fill: var(--pm-loader-brand-default);
            filter: drop-shadow(0 0 0px rgba(0, 0, 0, 0));
          }
          18% { /* ~0.9s - lines starting to connect */
            fill: var(--pm-loader-brand-active);
            filter: drop-shadow(0 0 8px var(--pm-loader-brand-glow-2));
          }
          28% { /* ~1.4s - maximum connection intensity */
            fill: var(--pm-loader-brand-active);
            filter: drop-shadow(0 0 15px var(--pm-loader-brand-glow-1)) drop-shadow(0 0 30px var(--pm-loader-brand-glow-2));
          }
          42% { /* ~2.1s - pulses moving away */
            fill: var(--pm-loader-brand-active);
            filter: drop-shadow(0 0 12px var(--pm-loader-brand-glow-2));
          }
          52% { /* ~2.6s - disconnected */
            fill: var(--pm-loader-brand-default);
            filter: drop-shadow(0 0 0px rgba(0, 0, 0, 0));
          }
          100% {
            fill: var(--pm-loader-brand-default);
            filter: drop-shadow(0 0 0px rgba(0, 0, 0, 0));
          }
        }
      `}</style>

      <svg
        viewBox="80 220 740 520"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        className="pm-loader-svg"
      >
        <defs>
          <linearGradient
            id="pm-traceGradient1"
            x1="250"
            y1="120"
            x2="100"
            y2="200"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="currentColor" stopOpacity="1"></stop>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.5"></stop>
          </linearGradient>

          <linearGradient
            id="pm-traceGradient2"
            x1="650"
            y1="120"
            x2="800"
            y2="300"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="currentColor" stopOpacity="1"></stop>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.5"></stop>
          </linearGradient>

          <linearGradient
            id="pm-traceGradient3"
            x1="250"
            y1="380"
            x2="400"
            y2="400"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="currentColor" stopOpacity="1"></stop>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.5"></stop>
          </linearGradient>

          <linearGradient
            id="pm-traceGradient4"
            x1="650"
            y1="120"
            x2="500"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="currentColor" stopOpacity="1"></stop>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.5"></stop>
          </linearGradient>
        </defs>

        <g id="pm-browser" transform="translate(0, 200)">
          <rect
            x="250"
            y="120"
            width="400"
            height="260"
            rx="12"
            ry="12"
            className="pm-loader-browser-frame"
          />

          <rect
            x="250"
            y="120"
            width="400"
            height="36"
            rx="12"
            ry="12"
            className="pm-loader-browser-top"
          />
          
          {/* Browser control dots */}
          <circle cx="275" cy="138" r="5" className="pm-loader-dot" style={{ fill: '#ef4444' }} />
          <circle cx="295" cy="138" r="5" className="pm-loader-dot" style={{ fill: '#eab308' }} />
          <circle cx="315" cy="138" r="5" className="pm-loader-dot" style={{ fill: '#22c55e' }} />

          <text x="450" y="143" textAnchor="middle" className="pm-loader-text">
            {text ? text.toUpperCase() : 'CONNECTING SYSTEM...'}
          </text>

          <text x="450" y="278" textAnchor="middle" className="pm-loader-brand">
            STAGE
          </text>
        </g>

        <g id="pm-traces" transform="translate(0, 200)">
          <path d="M100 300 H250 V120" className="pm-loader-trace-flow" />
          <path d="M800 200 H650 V380" className="pm-loader-trace-flow" />
          <path d="M400 520 V380 H250" className="pm-loader-trace-flow" />
          <path d="M500 50 V120 H650" className="pm-loader-trace-flow" />
        </g>
      </svg>
    </div>
  );

  if (fullPage) {
    const backdropClass = isDark
      ? "bg-[#030303]/95"
      : "bg-[#f8fafc]/95";

    return (
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center ${backdropClass} backdrop-blur-lg transition-colors duration-300`}>
        {content}
      </div>
    );
  }

  return content;
}
