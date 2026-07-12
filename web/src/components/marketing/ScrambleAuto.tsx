'use client';

/**
 * ScrambleAuto
 * Continuously auto-running wave scramble — dark theme only.
 * Uses code-language characters (symbols, digits, operators) instead of alphabets.
 * Wave sweeps L→R, letters scramble with code chars, then resolves back.
 * Loops with a short pause between each sweep.
 */

import { useRef, useEffect, useState, useCallback, memo } from 'react';

// Code-language char pool — operators, brackets, digits, symbols
const CODE_CHARS = '{}[]()<>=!@#\$%^&*|;:.,/\\\\0123456789+-_~?';

interface ScrambleAutoProps {
  text: string;
  isDark: boolean;
  className?: string;
  sweepDuration?: number; // ms for one wave sweep
  pauseBetween?: number;  // ms idle between sweeps
}

function ScrambleAuto({
  text,
  isDark,
  className = '',
  sweepDuration = 1200,
  pauseBetween = 2800,
}: ScrambleAutoProps) {
  const [chars, setChars] = useState<string[]>(text.split(''));
  const rafRef    = useRef<number>(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout>>();
  const mounted   = useRef(false);

  const rnd = useCallback(
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    []
  );

  const runSweep = useCallback(() => {
    const letters = text.split('');
    const n = letters.length;
    const start = performance.now();

    const tick = () => {
      const progress = Math.min(1, (performance.now() - start) / sweepDuration);
      // ease-in-out cubic
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const frontier = eased * (n + 2); // +2 so tail clears fully

      setChars(
        letters.map((ch, i) => {
          if (ch === ' ' || ch === '.') return ch;
          if (i < frontier - 1.5) return ch;           // resolved
          if (i <= frontier)       return '|';          // cursor front
          if (i <= frontier + 3)   return rnd();        // near-scramble
          return rnd();                                  // scrambling ahead
        })
      );

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setChars(letters); // snap to clean state
        // Schedule next loop
        timerRef.current = setTimeout(runSweep, pauseBetween);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [text, sweepDuration, pauseBetween, rnd]);

  useEffect(() => {
    if (!isDark) return;
    mounted.current = true;
    // Small delay on first run so it appears after hero text settles
    timerRef.current = setTimeout(runSweep, 800);

    return () => {
      mounted.current = false;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
      setChars(text.split(''));
    };
  }, [isDark, runSweep, text]);

  if (!isDark) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      className={className}
      style={{ display: 'inline-block', fontVariantLigatures: 'none' }}
    >
      {chars.map((ch, i) => {
        const isCode = ch !== ' ' && ch !== '.' && !text.split('').includes(ch) || (ch !== text[i]);
        return (
          <span
            key={i}
            style={{
              display: 'inline',
              fontFamily: ch === '|' || (isCode && ch !== text[i])
                ? "'JetBrains Mono', monospace"
                : 'inherit',
              color: ch === '|'
                ? 'rgba(147,197,253,1)'
                : (isCode && ch !== text[i])
                  ? 'rgba(99,102,241,0.85)'
                  : undefined,
              opacity: ch === '|' ? 1 : undefined,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

export default memo(ScrambleAuto);