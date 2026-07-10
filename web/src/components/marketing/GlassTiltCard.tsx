'use client';

import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface GlassTiltCardProps extends React.ComponentPropsWithoutRef<typeof motion.div> {
  children: React.ReactNode;
  className?: string;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: () => void;
}

export const GlassTiltCard = ({ children, className = '', onMouseEnter, onMouseLeave, ...props }: GlassTiltCardProps) => {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  // Smooth springs for tilt
  const rotateX = useSpring(useTransform(y, [0, 1], [6, -6]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-6, 6]), { stiffness: 150, damping: 18 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
    if (onMouseLeave) onMouseLeave();
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseEnter) onMouseEnter(e);
  };

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`bg-white/70 backdrop-blur-xl border border-pm-border/60 rounded-2xl p-8 relative overflow-hidden group hover:border-[#253B80]/35 hover:bg-white hover:shadow-[0_20px_48px_-12px_rgba(37,59,128,0.08)] transition-all duration-400 ${className}`}
      {...props}
    >
      <div style={{ transform: 'translateZ(20px)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {children}
      </div>
    </motion.div>
  );
};
