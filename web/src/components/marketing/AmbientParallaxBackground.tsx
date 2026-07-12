'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface OrbConfig {
  id: number;
  x: number;
  y: number;
  size: string;
  depth: number;
  color: string;
  blur: string;
  opacity: number;
  driftX: number[];
  driftY: number[];
  duration: number;
  delay: number;
}

const ORBS: OrbConfig[] = [
  {
    id: 1, x: -5, y: 5, size: '38rem', depth: 0.06,
    color: 'radial-gradient(circle, rgba(252, 226, 225, 0.85) 0%, rgba(252, 226, 225, 0) 70%)',
    blur: '80px', opacity: 0.7,
    driftX: [0, 18, -8, 14, 0], driftY: [0, -14, 10, -6, 0],
    duration: 22, delay: 0,
  },
  {
    id: 2, x: 62, y: -8, size: '42rem', depth: 0.035,
    color: 'radial-gradient(circle, rgba(199, 180, 214, 0.65) 0%, rgba(199, 180, 214, 0) 70%)',
    blur: '90px', opacity: 0.5,
    driftX: [0, -22, 12, -10, 0], driftY: [0, 16, -12, 8, 0],
    duration: 28, delay: 3,
  },
  {
    id: 3, x: 30, y: 15, size: '50rem', depth: 0.018,
    color: 'radial-gradient(circle, rgba(37, 59, 128, 0.12) 0%, rgba(37, 59, 128, 0) 70%)',
    blur: '80px', opacity: 0.9,
    driftX: [0, 10, -16, 6, 0], driftY: [0, -8, 14, -6, 0],
    duration: 35, delay: 1,
  },
  {
    id: 4, x: 70, y: 55, size: '36rem', depth: 0.05,
    color: 'radial-gradient(circle, rgba(226, 243, 245, 0.85) 0%, rgba(226, 243, 245, 0) 70%)',
    blur: '85px', opacity: 0.6,
    driftX: [0, -14, 20, -8, 0], driftY: [0, 12, -18, 10, 0],
    duration: 26, delay: 5,
  },
  {
    id: 5, x: -8, y: 48, size: '30rem', depth: 0.045,
    color: 'radial-gradient(circle, rgba(66, 124, 230, 0.22) 0%, rgba(66, 124, 230, 0) 70%)',
    blur: '70px', opacity: 0.8,
    driftX: [0, 20, -10, 16, 0], driftY: [0, -16, 8, -14, 0],
    duration: 20, delay: 7,
  },
  {
    id: 6, x: 5, y: 72, size: '28rem', depth: 0.07,
    color: 'radial-gradient(circle, rgba(243, 198, 196, 0.6) 0%, rgba(243, 198, 196, 0) 70%)',
    blur: '75px', opacity: 0.5,
    driftX: [0, 16, -20, 10, 0], driftY: [0, -10, 16, -8, 0],
    duration: 18, delay: 2,
  },
  {
    id: 7, x: 40, y: -20, size: '55rem', depth: 0.01,
    color: 'radial-gradient(circle, rgba(37, 59, 128, 0.08) 0%, rgba(37, 59, 128, 0) 70%)',
    blur: '60px', opacity: 0.8,
    driftX: [0, -8, 12, -4, 0], driftY: [0, 10, -8, 6, 0],
    duration: 45, delay: 0,
  },
  {
    id: 8, x: 88, y: 28, size: '24rem', depth: 0.055,
    color: 'radial-gradient(circle, rgba(199, 180, 214, 0.5) 0%, rgba(199, 180, 214, 0) 70%)',
    blur: '60px', opacity: 0.7,
    driftX: [0, -18, 8, -12, 0], driftY: [0, 14, -10, 8, 0],
    duration: 24, delay: 9,
  },
];

interface AmbientParallaxBackgroundProps {
  variant?: 'full' | 'light';
}

function OrbLayer({ orb, springX, springY }: {
  orb: OrbConfig;
  springX: ReturnType<typeof useSpring>;
  springY: ReturnType<typeof useSpring>;
}) {
  const xOffset = useTransform(springX, [0, 1], [-orb.depth * 80, orb.depth * 80]);
  const yOffset = useTransform(springY, [0, 1], [-orb.depth * 60, orb.depth * 60]);

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${orb.x}%`,
        top: `${orb.y}%`,
        x: xOffset,
        y: yOffset,
        willChange: 'transform',
      }}
    >
      <motion.div
        className="rounded-full"
        style={{
          width: orb.size,
          height: orb.size,
          background: orb.color,
          filter: `blur(${orb.blur})`,
          opacity: orb.opacity,
          willChange: 'transform',
        }}
        animate={{ x: orb.driftX, y: orb.driftY }}
        transition={{
          duration: orb.duration,
          delay: orb.delay,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatType: 'mirror',
        }}
      />
    </motion.div>
  );
}

export default function AmbientParallaxBackground({
  variant = 'full',
}: AmbientParallaxBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isActiveRef = useRef(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springX = useSpring(mouseX, { stiffness: 28, damping: 22, mass: 1.2 });
  const springY = useSpring(mouseY, { stiffness: 28, damping: 22, mass: 1.2 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isActiveRef.current) return;
    mouseX.set(e.clientX / window.innerWidth);
    mouseY.set(e.clientY / window.innerHeight);
  }, [mouseX, mouseY]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const observer = new IntersectionObserver(
      ([entry]) => { isActiveRef.current = entry.isIntersecting; },
      { threshold: 0.01 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, [handleMouseMove]);

  const orbs = variant === 'light' ? ORBS.slice(0, 3) : ORBS;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 0 }}
    >
      {orbs.map((orb) => (
        <OrbLayer key={orb.id} orb={orb} springX={springX} springY={springY} />
      ))}
    </div>
  );
}
