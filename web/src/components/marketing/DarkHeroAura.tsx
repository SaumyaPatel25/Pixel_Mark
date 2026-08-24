'use client';

import { useEffect, useRef, memo } from 'react';

interface DarkHeroAuraProps {
  isDark: boolean;
}

const LERP  = 0.06;
const BLOOM = 0.03;

function DarkHeroAura({ isDark }: DarkHeroAuraProps) {
  const auraRef  = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);
  const activeRef = useRef<boolean>(false);

  const cursor   = useRef({ x: 0.5, y: 0.5 });
  const auraPos  = useRef({ x: 0.5, y: 0.5 });
  const bloomPos = useRef({ x: 0.5, y: 0.5 });
  const hovered  = useRef(false);

  useEffect(() => {
    if (!isDark) return;
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    activeRef.current = true;
    const heroEl = document.getElementById('hero-section');
    let cachedW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    let cachedH = typeof window !== 'undefined' ? window.innerHeight : 800;

    const measureHero = () => {
      if (heroEl) {
        const r = heroEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          cachedW = r.width;
          cachedH = r.height;
        }
      }
    };
    measureHero();

    const onMove = (e: MouseEvent) => {
      if (!heroEl) return;
      if (cachedW === 0) measureHero();
      const r = heroEl.getBoundingClientRect();
      cursor.current.x = (e.clientX - r.left) / (r.width || 1);
      cursor.current.y = (e.clientY - r.top)  / (r.height || 1);
    };
    const onEnter = () => { hovered.current = true; };
    const onLeave = () => {
      hovered.current = false;
      cursor.current = { x: 0.5, y: 0.5 };
    };

    heroEl?.addEventListener('mousemove',  onMove,  { passive: true });
    heroEl?.addEventListener('mouseenter', onEnter, { passive: true });
    heroEl?.addEventListener('mouseleave', onLeave, { passive: true });
    window.addEventListener('resize', measureHero, { passive: true });

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (!activeRef.current) return;

      const target = hovered.current ? cursor.current : { x: 0.5, y: 0.5 };

      const diffX = Math.abs(target.x - auraPos.current.x);
      const diffY = Math.abs(target.y - auraPos.current.y);

      // Stop updating styles when settled and unhovered
      if (!hovered.current && diffX < 0.001 && diffY < 0.001) {
        if (auraRef.current) auraRef.current.style.opacity = '0';
        if (bloomRef.current) bloomRef.current.style.opacity = '0';
        return;
      }

      auraPos.current.x  += (target.x          - auraPos.current.x)  * LERP;
      auraPos.current.y  += (target.y          - auraPos.current.y)  * LERP;
      bloomPos.current.x += (auraPos.current.x - bloomPos.current.x) * BLOOM;
      bloomPos.current.y += (auraPos.current.y - bloomPos.current.y) * BLOOM;

      if (auraRef.current) {
        const px = auraPos.current.x * cachedW;
        const py = auraPos.current.y * cachedH;
        auraRef.current.style.transform = `translate3d(${px - 250}px, ${py - 250}px, 0)`;
        auraRef.current.style.opacity   = hovered.current ? '1' : '0';
      }
      if (bloomRef.current) {
        const px = bloomPos.current.x * cachedW;
        const py = bloomPos.current.y * cachedH;
        bloomRef.current.style.transform = `translate3d(${px - 375}px, ${py - 375}px, 0)`;
        bloomRef.current.style.opacity   = hovered.current ? '0.6' : '0';
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    const io = new IntersectionObserver(
      ([e]) => { activeRef.current = e.isIntersecting; },
      { threshold: 0.01 }
    );
    if (heroEl) io.observe(heroEl);

    return () => {
      cancelAnimationFrame(rafRef.current);
      activeRef.current = false;
      heroEl?.removeEventListener('mousemove',  onMove);
      heroEl?.removeEventListener('mouseenter', onEnter);
      heroEl?.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', measureHero);
      io.disconnect();
    };
  }, [isDark]);

  if (!isDark) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 5 }}
    >
      <div
        ref={auraRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(120,100,255,0.45) 0%, rgba(99,102,241,0.2) 40%, transparent 70%)',
          filter: 'blur(55px)',
          transform: 'translate3d(-250px, -250px, 0)',
          opacity: 0,
          willChange: 'transform, opacity',
          transition: 'opacity 0.6s ease',
          pointerEvents: 'none',
        }}
      />
      <div
        ref={bloomRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '750px',
          height: '750px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67,130,223,0.22) 0%, rgba(139,92,246,0.1) 45%, transparent 72%)',
          filter: 'blur(80px)',
          transform: 'translate3d(-375px, -375px, 0)',
          opacity: 0,
          willChange: 'transform, opacity',
          transition: 'opacity 0.9s ease',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export default memo(DarkHeroAura);