'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type Edge = 'top' | 'bottom' | 'left' | 'right';

interface Position {
  edge: Edge;
  offset: number; // 0..1 along that edge
}

const HIDE_DURATION   = 2800; // ms hidden
const PEEK_DURATION   = 2200; // ms peeking
const SENTINEL_SIZE   = 84;   // px

function randomEdgePos(): Position {
  const edges: Edge[] = ['top', 'bottom', 'left', 'right'];
  return {
    edge: edges[Math.floor(Math.random() * edges.length)],
    offset: 0.15 + Math.random() * 0.7,
  };
}

/** Translate a Position → { x, y, rotate } for the sentinel SVG */
function posToStyle(pos: Position, cardW: number, cardH: number) {
  const half    = SENTINEL_SIZE / 2;
  const overhang = half * 0.55;
  // How much of the sentinel appears inside the card on all four edges
  const visible = SENTINEL_SIZE - half + overhang;

  switch (pos.edge) {
    case 'top':
      return { x: pos.offset * cardW - half, y: -half + overhang, rotate: 180 };
    case 'bottom':
      return { x: pos.offset * cardW - half, y: cardH - visible,  rotate: 0 };
    case 'left':
      return { x: -half + overhang, y: pos.offset * cardH - half, rotate: 90 };
    case 'right':
      return { x: cardW - visible,  y: pos.offset * cardH - half, rotate: -90 };
  }
}

function hiddenStyle(pos: Position, cardW: number, cardH: number) {
  const half = SENTINEL_SIZE / 2;
  switch (pos.edge) {
    case 'top':    return { x: pos.offset * cardW - half, y: -(SENTINEL_SIZE + 8), rotate: 180 };
    case 'bottom': return { x: pos.offset * cardW - half, y: cardH + 8,            rotate: 0 };
    case 'left':   return { x: -(SENTINEL_SIZE + 8),      y: pos.offset * cardH - half, rotate: 90 };
    case 'right':  return { x: cardW + 8,                 y: pos.offset * cardH - half, rotate: -90 };
  }
}

/* ── Minimal standalone Sentinel SVG (idle, indigo eye, dark helmet) ─── */
function SentinelMini() {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
    }, 3200 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <svg
      width={SENTINEL_SIZE}
      height={SENTINEL_SIZE}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="hs-metalGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#2e303e" />
          <stop offset="60%"  stopColor="#181922" />
          <stop offset="100%" stopColor="#0e0f14" />
        </radialGradient>
        <linearGradient id="hs-visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#0f1016" />
          <stop offset="100%" stopColor="#050508" />
        </linearGradient>
        <filter id="hs-eyeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Rotating halo */}
      <motion.circle
        cx="80" cy="80" r="66"
        stroke="rgba(99,130,255,0.18)"
        strokeWidth="1.5"
        strokeDasharray="12 28 8 40"
        fill="none"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
        style={{ transformOrigin: '80px 80px' }}
      />

      {/* Ear fins */}
      <path d="M22 65 L12 70 L12 85 L22 80 Z" fill="#1b1c25" stroke="#374151" strokeWidth="1.5" />
      <path d="M138 65 L148 70 L148 85 L138 80 Z" fill="#1b1c25" stroke="#374151" strokeWidth="1.5" />
      <circle cx="12"  cy="70" r="2.5" fill="#818cf8" opacity={0.6} />
      <circle cx="148" cy="70" r="2.5" fill="#818cf8" opacity={0.6} />

      {/* Helmet body */}
      <rect x="24" y="35" width="112" height="90" rx="24"
        fill="url(#hs-metalGrad)" stroke="#2a2c3a" strokeWidth="2.5" />

      {/* Top ridge */}
      <rect x="56" y="30" width="48" height="6" rx="3" fill="#2e303e" />
      <line x1="80" y1="31" x2="80" y2="35" stroke="#4b5563" strokeWidth="1.5" />

      {/* Faceplate accents */}
      <path d="M30 45 L50 45" stroke="#262730" strokeWidth="1.5" />
      <path d="M110 45 L130 45" stroke="#262730" strokeWidth="1.5" />
      <path d="M30 115 L50 115" stroke="#262730" strokeWidth="1.5" />
      <path d="M110 115 L130 115" stroke="#262730" strokeWidth="1.5" />

      {/* Visor */}
      <rect x="36" y="56" width="88" height="46" rx="12"
        fill="url(#hs-visorGrad)" stroke="#3730a3" strokeWidth="2.5" />

      {/* Visor reflection */}
      <path d="M42 62 L90 62" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />

      {/* Scanline */}
      <motion.line
        x1="38" y1="58" x2="122" y2="58"
        stroke="#818cf8" strokeWidth="1.5" opacity={0.25}
        animate={{ y: [0, 42, 0] }}
        transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
      />

      {/* Eye */}
      <motion.ellipse
        cx={80} cy={79}
        rx={8} ry={blink ? 0.5 : 8}
        fill="#818cf8"
        filter="url(#hs-eyeGlow)"
        transition={{ duration: 0.08 }}
      />

      {/* Status LED */}
      <motion.circle
        cx="80" cy="112" r="2.5" fill="#818cf8"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      />

      {/* Corner UI ticks */}
      <rect x="44" y="86" width="6" height="6" rx="1" fill="#3b82f6" opacity={0.28} />
      <rect x="110" y="86" width="6" height="6" rx="1" fill="#6366f1" opacity={0.2} />

      {/* Lower shield plate */}
      <path d="M50 134 L110 134 L120 142 L40 142 Z" fill="#1e202b" stroke="#2d303f" strokeWidth="1.5" />
      <line x1="70" y1="138" x2="90" y2="138" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Main hide-and-seek orchestrator ─────────────────────────────────── */
export default function SentinelHideAndSeek() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<Position>(() => randomEdgePos());
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Measure card on mount + resize */
  useEffect(() => {
    const measure = () => {
      if (cardRef.current) {
        const { width, height } = cardRef.current.getBoundingClientRect();
        setDims({ w: width, h: height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /* Hide → appear cycle */
  useEffect(() => {
    if (dims.w === 0) return;

    const cycle = () => {
      // Hidden phase
      setVisible(false);
      timerRef.current = setTimeout(() => {
        // Pick new position and show
        setPos(randomEdgePos());
        setVisible(true);
        timerRef.current = setTimeout(cycle, PEEK_DURATION);
      }, HIDE_DURATION);
    };

    // Kick off first cycle with a small initial delay
    timerRef.current = setTimeout(() => {
      setPos(randomEdgePos());
      setVisible(true);
      timerRef.current = setTimeout(cycle, PEEK_DURATION);
    }, 1200);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [dims.w]);

  if (dims.w === 0) {
    // Invisible measurement anchor
    return <div ref={cardRef} className="absolute inset-0 pointer-events-none" />;
  }

  const peekXY   = posToStyle(pos, dims.w, dims.h);
  const hiddenXY = hiddenStyle(pos, dims.w, dims.h);

  return (
    <>
      {/* Invisible overlay that fills the card for measurement */}
      <div ref={cardRef} className="absolute inset-0 pointer-events-none" />

      <AnimatePresence>
        {visible && (
          <motion.div
            key={`${pos.edge}-${pos.offset}`}
            className="absolute z-30"
            style={{
              width: SENTINEL_SIZE,
              height: SENTINEL_SIZE,
              top: 0,
              left: 0,
              filter: 'drop-shadow(0 0 14px rgba(99,130,255,0.55))',
              cursor: 'pointer',
            }}
            initial={{
              x: hiddenXY!.x,
              y: hiddenXY!.y,
              rotate: hiddenXY!.rotate,
              opacity: 0,
              scale: 0.7,
            }}
            animate={{
              x: peekXY!.x,
              y: peekXY!.y,
              rotate: peekXY!.rotate,
              opacity: 1,
              scale: 1,
            }}
            exit={{
              x: hiddenXY!.x,
              y: hiddenXY!.y,
              rotate: hiddenXY!.rotate,
              opacity: 0,
              scale: 0.7,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 22,
              opacity: { duration: 0.22 },
            }}
            onClick={() => router.push('/login')}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
          >
            {/* Peek trail glow */}
            <motion.div
              className="absolute inset-0 rounded-full blur-xl pointer-events-none"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ background: 'rgba(99,130,255,0.35)' }}
            />
            <SentinelMini />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
