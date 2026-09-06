'use strict';
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface AnimatedMetricCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export const AnimatedMetricCounter: React.FC<AnimatedMetricCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1.6,
  className = '',
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const [displayValue, setDisplayValue] = useState<string>(
    decimals > 0 ? value.toFixed(decimals) : value.toString()
  );

  useEffect(() => {
    if (!isInView) return;

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      
      // Duol easeOutExpo formula
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = easedProgress * value;

      setDisplayValue(decimals > 0 ? current.toFixed(decimals) : Math.floor(current).toString());

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(decimals > 0 ? value.toFixed(decimals) : value.toString());
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isInView, value, duration, decimals]);

  return (
    <span ref={ref} className={`inline-flex items-baseline font-mono tracking-tight ${className}`}>
      {prefix && <span>{prefix}</span>}
      <span>{displayValue}</span>
      {suffix && <span>{suffix}</span>}
    </span>
  );
};
