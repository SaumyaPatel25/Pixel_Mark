'use client';

import { motion, MotionValue, useReducedMotion, useMotionTemplate } from 'framer-motion';

interface FloatingHeroShapeProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

export default function FloatingHeroShape({ x, y }: FloatingHeroShapeProps) {
  const shouldReduceMotion = useReducedMotion();

  const leftValue = useMotionTemplate`${x}%`;
  const topValue = useMotionTemplate`${y}%`;

  const motionProps = shouldReduceMotion 
    ? { style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' } }
    : { style: { left: leftValue, top: topValue, transform: 'translate(-50%, -50%)' } };

  return (
    <motion.div
      {...motionProps}
      className="absolute z-40 pointer-events-none drop-shadow-2xl"
      aria-hidden="true"
    >
      {/* 3D Glassy Capsule Shape */}
      <svg
        width="160"
        height="64"
        viewBox="0 0 160 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-40 h-16 drop-shadow-[0_20px_40px_rgba(37,99,235,0.3)]"
      >
        <defs>
          <linearGradient id="capsule-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#f8fafc" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#eff6ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="capsule-rim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
          </linearGradient>

          <filter id="soft-inner-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feOffset dx="0" dy="-4"/>
            <feGaussianBlur stdDeviation="4" result="offset-blur"/>
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
            <feFlood floodColor="#3b82f6" floodOpacity="0.2" result="color"/>
            <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
            <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
          </filter>
        </defs>

        {/* Main Body */}
        <rect
          x="2"
          y="2"
          width="156"
          height="60"
          rx="30"
          fill="url(#capsule-fill)"
          stroke="url(#capsule-rim)"
          strokeWidth="1.5"
          filter="url(#soft-inner-shadow)"
        />

        {/* Top Specular Highlight */}
        <path
          d="M 20,8 L 140,8 C 150,8 150,20 140,20 L 20,20 C 10,20 10,8 20,8 Z"
          fill="#ffffff"
          opacity="0.8"
          filter="blur(2px)"
        />

        {/* Secondary Glint */}
        <ellipse
          cx="30"
          cy="16"
          rx="12"
          ry="6"
          fill="#ffffff"
          opacity="0.9"
          filter="blur(1px)"
          transform="rotate(-15 30 16)"
        />
      </svg>
    </motion.div>
  );
}
