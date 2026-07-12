'use client';

/**
 * ScrambleHover
 * A wave-style letter-scramble effect that fires on hover.
 * Dark-theme only: passes through plain text when isDark=false.
 *
 * Effect:
 *   - A wave sweeps left-to-right across the letters
 *   - Letters ahead of the wave show block/glitch chars
 *   - Letters behind the wave resolve back to their original char
 *   - Each hover entry reruns the wave from scratch
 */

import { useRef, useEffect, useState, useCallback, memo } from 'react';

const GLITCH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#\$%&*+=';
const BLOCK   = String.fromCharCode(0x2593); // dense block char

interface ScrambleHoverProps {
  text: string;
  isDark: boolean;
  className?: string;
  duration?: number; // wave sweep duration in ms
}

function ScrambleHover({ text, isDark, className = '', duration = 800 }: ScrambleHoverProps) {
  const [chars, setChars] = useState<string[]>(text.split(''));
  const rafRef   = useRef<number>(0);
  const startRef = useRef<number>(0);
  const playingRef = useRef(false);

  const rndGlitch = useCallback(() => GLITCH[Math.floor(Math.random() * GLITCH.length)], []);

  const runWave = useCallback(() => {
    if (playingRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    playingRef.current = true;
    startRef.current = performance.now();

    const letters = text.split('');
    const n = letters.length;

    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const frontier = eased * n;

      const next = letters.map((ch, i) => {
        if (ch === ' ' || ch === '.') return ch;
        if (i < frontier - 1) return ch;       // wave passed: show real char
        if (i <= frontier + 0.5) return BLOCK; // at wave front: block cursor
        return rndGlitch();                     // ahead of wave: scrambling
      });
      setChars(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setChars(letters);
        playingRef.current = false;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [text, duration, rndGlitch]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // In light theme, just render the plain text span with same className
  if (!isDark) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      className={className}
      onMouseEnter={runWave}
      style={{ cursor: 'default', display: 'inline-block' }}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          style={{
            display: 'inline',
            color: ch === BLOCK ? 'rgba(147,197,253,0.9)' : undefined,
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

export default memo(ScrambleHover);