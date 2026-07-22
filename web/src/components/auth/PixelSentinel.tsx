'use client'

import React, { useEffect, useState, useRef } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'

export type SentinelState =
  | 'idle'
  | 'emailFocus'
  | 'passwordFocus'
  | 'typing'
  | 'weak'
  | 'valid'
  | 'submitting'
  | 'success'
  | 'error'

interface PixelSentinelProps {
  state: SentinelState
  showPassword?: boolean
  focusedField?: 'email' | 'password' | 'other' | null
  emailLength?: number
  passwordLength?: number
  nameLength?: number
}

export default function PixelSentinel({
  state,
  showPassword = false,
  focusedField = null,
  emailLength = 0,
  passwordLength = 0,
  nameLength = 0,
}: PixelSentinelProps) {
  const prefersReducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 })

  // Avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Mouse cursor tracking listener
  useEffect(() => {
    if (!mounted) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      const maxOffset = 7.5 // Capped to stay within visor boundary
      
      if (distance === 0) {
        setMouseCoords({ x: 0, y: 0 })
      } else {
        const scale = Math.min(distance * 0.04, maxOffset) / distance
        setMouseCoords({
          x: dx * scale,
          y: dy * scale,
        })
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mounted, prefersReducedMotion])

  // State flags
  const isIdle = state === 'idle'
  const isEmail = state === 'emailFocus'
  const isPassword = state === 'passwordFocus'
  const isTyping = state === 'typing'
  const isWeak = state === 'weak'
  const isValid = state === 'valid'
  const isSubmitting = state === 'submitting'
  const isSuccess = state === 'success'
  const isError = state === 'error'

  // Determine colors based on state
  let glowColor = 'rgba(139, 92, 246, 0.15)' // Default violet glow
  let eyeColor = '#a78bfa' // Default violet eye
  let visorStrokeColor = '#4c1d95' // Dark purple visor border
  let statusTextColor = '#c084fc'
  let statusLabel = 'Standby'

  if (isWeak) {
    glowColor = 'rgba(245, 158, 11, 0.25)' // Orange/Amber glow
    eyeColor = '#fbbf24' // Warning orange/yellow eye
    visorStrokeColor = '#b45309'
    statusTextColor = '#fcd34d'
    statusLabel = 'Vuln Alert'
  } else if (isValid) {
    glowColor = 'rgba(16, 185, 129, 0.25)' // Green glow
    eyeColor = '#34d399' // Emerald/teal eye
    visorStrokeColor = '#065f46'
    statusTextColor = '#6ee7b7'
    statusLabel = 'Secured'
  } else if (isSuccess) {
    glowColor = 'rgba(16, 185, 129, 0.35)' // Stronger green glow
    eyeColor = '#10b981' // Bright green eye
    visorStrokeColor = '#047857'
    statusTextColor = '#34d399'
    statusLabel = 'Access Granted'
  } else if (isError) {
    glowColor = 'rgba(239, 68, 68, 0.3)' // Red glow
    eyeColor = '#f87171' // Red eye
    visorStrokeColor = '#b91c1c'
    statusTextColor = '#f87171'
    statusLabel = 'Access Denied'
  } else if (isSubmitting) {
    glowColor = 'rgba(139, 92, 246, 0.35)'
    eyeColor = '#c084fc'
    visorStrokeColor = '#7c3aed'
    statusTextColor = '#e9d5ff'
    statusLabel = 'Authorizing...'
  } else if (isTyping) {
    glowColor = 'rgba(6, 182, 212, 0.3)' // Cyan glow
    eyeColor = '#22d3ee' // Cyan eye
    visorStrokeColor = '#0891b2'
    statusTextColor = '#67e8f9'
    statusLabel = 'Scanning...'
  } else if (isEmail) {
    glowColor = 'rgba(129, 140, 248, 0.2)' // Indigo glow
    eyeColor = '#818cf8' // Indigo eye
    visorStrokeColor = '#3730a3'
    statusTextColor = '#a5b4fc'
    statusLabel = 'Inspecting'
  } else if (isPassword) {
    if (showPassword) {
      glowColor = 'rgba(6, 182, 212, 0.3)'
      eyeColor = '#22d3ee'
      visorStrokeColor = '#0891b2'
      statusTextColor = '#67e8f9'
      statusLabel = 'Decrypting'
    } else {
      glowColor = 'rgba(75, 85, 99, 0.2)' // Slate glow for hidden
      eyeColor = '#9ca3af' // Muted grey eye shutter
      visorStrokeColor = '#374151'
      statusTextColor = '#9ca3af'
      statusLabel = 'Shields Up'
    }
  }

  // Motion Settings
  const shouldAnimate = mounted

  // Mascot Helmet pose & bobbing
  const helmetAnimate = !shouldAnimate
    ? {}
    : {
        x: isError ? [0, -6, 6, -6, 6, 0] : isWeak ? [0, -2, 2, -2, 2, 0] : isEmail ? -4 : 0,
        y: isSuccess
          ? [0, -25, 4, -4, 0]
          : isSubmitting
          ? [0, -6, 0]
          : isTyping
          ? [0, -2, 0]
          : prefersReducedMotion
          ? 0
          : [0, -6, 0], // Disable idle breathing float for reduced motion
        scale: isSuccess ? [1, 1.15, 0.95, 1.05, 1] : isError ? [1, 0.95, 1] : 1,
        rotate: isSuccess
          ? [0, -10, 10, 0]
          : isError
          ? [0, -4, 4, -4, 0]
          : isWeak
          ? [0, -1.5, 1.5, -1.5, 0]
          : isEmail
          ? -3
          : 0,
      }

  const helmetTransition = !shouldAnimate
    ? {}
    : {
        y: {
          repeat: isSuccess ? 0 : Infinity,
          duration: isSuccess ? 0.8 : isSubmitting ? 1.2 : isTyping ? 0.3 : 3.5,
          ease: 'easeInOut',
        },
        rotate: isSuccess
          ? { duration: 0.8, ease: 'easeOut' }
          : isError || isWeak
          ? { repeat: Infinity, duration: 0.4, ease: 'linear' }
          : { duration: 0.4 },
        x: isError
          ? { duration: 0.4, ease: 'easeInOut' }
          : isWeak
          ? { repeat: Infinity, duration: 0.4 }
          : { duration: 0.3 },
        scale: {
          duration: 0.8,
          ease: 'easeOut',
        },
      }

  // Visor elements inside helmet SVG
  const isCurrentlyEmail = isEmail || (isTyping && focusedField === 'email')
  
  // Decide whether to track active input caret or mouse cursor
  let eyeXOffset = 0
  let eyeYOffset = 0
  let isTrackingInput = false

  if (focusedField === 'email') {
    eyeXOffset = -8 + Math.min(emailLength * 0.22, 5.5)
    eyeYOffset = 2
    isTrackingInput = true
  } else if (focusedField === 'password' && showPassword) {
    eyeXOffset = -8 + Math.min(passwordLength * 0.22, 5.5)
    eyeYOffset = 2
    isTrackingInput = true
  } else if (focusedField === 'other') {
    eyeXOffset = -8 + Math.min(nameLength * 0.22, 5.5)
    eyeYOffset = 1
    isTrackingInput = true
  } else {
    // If not tracking inputs and not shuttered/closed, follow mouse cursor
    eyeXOffset = mouseCoords.x
    eyeYOffset = mouseCoords.y
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center space-y-4 select-none w-full max-w-[200px] md:max-w-[240px] px-2 py-4"
    >
      {/* Background Glow Ring */}
      <div className="relative w-36 h-36 md:w-44 md:h-44 flex items-center justify-center">
        {mounted && (
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl transition-colors duration-500"
            animate={
              shouldAnimate
                ? {
                    scale: isSuccess ? [1.1, 1.3, 1.1] : isError ? [1, 1.15, 1] : [1, 1.06, 1],
                    opacity: isSuccess ? [0.7, 0.9, 0.7] : isError ? [0.5, 0.8, 0.5] : [0.4, 0.6, 0.4],
                  }
                : {}
            }
            transition={{
              repeat: Infinity,
              duration: isSuccess ? 0.8 : isError ? 0.3 : isTyping ? 1 : 3,
              ease: 'easeInOut',
            }}
            style={{
              background: `radial-gradient(circle, ${glowColor} 0%, rgba(9,9,14,0) 70%)`,
            }}
          />
        )}

        {/* Mascot SVG */}
        <motion.svg
          width="100%"
          height="100%"
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
          animate={helmetAnimate as any}
          transition={helmetTransition as any}
        >
          {/* Definitions */}
          <defs>
            <radialGradient id="metalGrad" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2e303e" />
              <stop offset="60%" stopColor="#181922" />
              <stop offset="100%" stopColor="#0e0f14" />
            </radialGradient>
            <linearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f1016" />
              <stop offset="100%" stopColor="#050508" />
            </linearGradient>
            <filter id="eyeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Rotating Ambient Halo behind helmet */}
          {shouldAnimate && (
            <motion.circle
              cx="80"
              cy="80"
              r="66"
              stroke={glowColor}
              strokeWidth="1.5"
              strokeDasharray="15 30 10 45"
              fill="none"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
              style={{ transformOrigin: '80px 80px' }}
            />
          )}

          {/* Floating/Orbiting Pixel Particles (Pixel Dust) */}
          {shouldAnimate && (
            <>
              {/* Top-Right Dust */}
              <motion.rect
                x="128"
                y="28"
                width="6"
                height="6"
                fill={eyeColor}
                opacity={0.7}
                animate={{
                  y: [0, -12, 0],
                  x: [0, 6, 0],
                  rotate: [0, 90, 180, 270, 360],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: 'easeInOut',
                }}
              />
              {/* Bottom-Left Dust */}
              <motion.rect
                x="24"
                y="114"
                width="8"
                height="8"
                fill={eyeColor}
                opacity={0.6}
                animate={{
                  y: [0, 14, 0],
                  x: [0, -8, 0],
                  rotate: [360, 270, 180, 90, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3.5,
                  ease: 'easeInOut',
                }}
              />
              {/* Top-Left Muted Dust */}
              <motion.rect
                x="32"
                y="36"
                width="5"
                height="5"
                fill="#818cf8"
                opacity={0.4}
                animate={{
                  y: [0, -10, 0],
                  x: [0, 8, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.7,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
              />
            </>
          )}

          {/* Dynamic Spark Particles shooting on Typing */}
          {shouldAnimate && isTyping && (
            <>
              <motion.rect
                x="80" y="75" width="3" height="3" fill={eyeColor}
                animate={{ x: [80, 45], y: [75, 45], opacity: [0, 1, 0], scale: [0.5, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 0.5, ease: 'easeOut' }}
              />
              <motion.rect
                x="80" y="75" width="3" height="3" fill={eyeColor}
                animate={{ x: [80, 115], y: [75, 50], opacity: [0, 1, 0], scale: [0.5, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 0.45, delay: 0.1, ease: 'easeOut' }}
              />
              <motion.rect
                x="80" y="80" width="2" height="2" fill={eyeColor}
                animate={{ x: [80, 50], y: [80, 105], opacity: [0, 0.8, 0], scale: [0.5, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              />
              <motion.rect
                x="80" y="80" width="3" height="3" fill="#ec4899"
                animate={{ x: [80, 110], y: [80, 100], opacity: [0, 0.9, 0], scale: [0.5, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 0.55, delay: 0.15, ease: 'easeOut' }}
              />
            </>
          )}

          {/* Side Antenna Ears */}
          <path d="M22 65 L12 70 L12 85 L22 80 Z" fill="#1b1c25" stroke="#374151" strokeWidth="1.5" />
          <path d="M138 65 L148 70 L148 85 L138 80 Z" fill="#1b1c25" stroke="#374151" strokeWidth="1.5" />

          {/* Antenna Glowing Tips */}
          <circle cx="12" cy="70" r="2.5" fill={eyeColor} opacity={isSubmitting || isTyping ? 1 : 0.6} />
          <circle cx="148" cy="70" r="2.5" fill={eyeColor} opacity={isSubmitting || isTyping ? 1 : 0.6} />

          {/* Helmet Body Casing */}
          <rect
            x="24"
            y="35"
            width="112"
            height="90"
            rx="24"
            fill="url(#metalGrad)"
            stroke="#2a2c3a"
            strokeWidth="2.5"
          />

          {/* Top Panel Ridge */}
          <rect x="56" y="30" width="48" height="6" rx="3" fill="#2e303e" />
          <line x1="80" y1="31" x2="80" y2="35" stroke="#4b5563" strokeWidth="1.5" />

          {/* Faceplate Lines */}
          <path d="M30 45 L50 45" stroke="#262730" strokeWidth="1.5" />
          <path d="M110 45 L130 45" stroke="#262730" strokeWidth="1.5" />
          <path d="M30 115 L50 115" stroke="#262730" strokeWidth="1.5" />
          <path d="M110 115 L130 115" stroke="#262730" strokeWidth="1.5" />

          {/* Visor Area Border */}
          <rect
            x="36"
            y="56"
            width="88"
            height="46"
            rx="12"
            fill="url(#visorGrad)"
            stroke={visorStrokeColor}
            strokeWidth="2.5"
          />

          {/* Visor Reflection Highlights */}
          <path d="M42 62 L90 62" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />
          <path d="M42 66 L60 66" stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1" />

          {/* Moving Scanline inside visor */}
          {shouldAnimate && (
            <motion.line
              x1="38"
              y1="58"
              x2="122"
              y2="58"
              stroke={eyeColor}
              strokeWidth="1.5"
              opacity={0.3}
              animate={{
                y: [0, 42, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: isTyping ? 1.2 : isSubmitting ? 1.5 : 3.5,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* VISOR EYE / SHIELD RENDER */}
          <g>
            {/* If password field is active and password hidden -> Shields Up */}
            {isPassword && !showPassword ? (
              /* Slit Visor Shutter (Locked/Encrypted slit) */
              <motion.line
                x1="48"
                y1="79"
                x2="112"
                y2="79"
                stroke={eyeColor}
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#eyeGlow)"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            ) : isSubmitting ? (
              /* Rotating Loader Circle */
              <motion.circle
                cx="80"
                cy="79"
                r="13"
                stroke={eyeColor}
                strokeWidth="2"
                strokeDasharray="25 35"
                fill="none"
                filter="url(#eyeGlow)"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{ transformOrigin: '80px 79px' }}
              />
            ) : isSuccess ? (
              /* Happy eye check/curved marks ^ ^ */
              <motion.path
                d="M60 82 Q70 72 80 82 M80 82 Q90 72 100 82"
                stroke={eyeColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                filter="url(#eyeGlow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4 }}
              />
            ) : isError ? (
              /* Error Red Crosses X X */
              <g filter="url(#eyeGlow)">
                <motion.line
                  x1="62" y1="71" x2="74" y2="83"
                  stroke={eyeColor} strokeWidth="3" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }}
                />
                <motion.line
                  x1="74" y1="71" x2="62" y2="83"
                  stroke={eyeColor} strokeWidth="3" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }}
                />
                <motion.line
                  x1="86" y1="71" x2="98" y2="83"
                  stroke={eyeColor} strokeWidth="3" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.1 }}
                />
                <motion.line
                  x1="98" y1="71" x2="86" y2="83"
                  stroke={eyeColor} strokeWidth="3" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.1 }}
                />
              </g>
            ) : isValid ? (
              /* Confidence glow checkmark HUD */
              <g filter="url(#eyeGlow)">
                {/* HUD scanning background grid */}
                <circle cx="80" cy="79" r="15" stroke={eyeColor} strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />
                <motion.path
                  d="M72 79 L77 84 L88 73"
                  stroke={eyeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4 }}
                />
              </g>
            ) : isWeak ? (
              /* Warning exclamation point inside eye */
              <g filter="url(#eyeGlow)">
                <ellipse cx="80" cy="79" rx="8" ry="8" fill="none" stroke={eyeColor} strokeWidth="2" />
                <motion.path
                  d="M80 74 L80 80 M80 84 L80 84.5"
                  stroke={eyeColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
              </g>
            ) : (
              /* Standard Eye (Idle, Email focus, Typing, Decrypting) */
              <motion.ellipse
                cx={80}
                cy={79}
                rx={isTyping ? 9 : 8}
                ry={isTyping ? 9 : 8}
                fill={eyeColor}
                filter="url(#eyeGlow)"
                animate={
                  shouldAnimate
                    ? {
                        x: isTrackingInput && isTyping
                          ? [eyeXOffset, eyeXOffset + 1.2, eyeXOffset - 1.2, eyeXOffset]
                          : eyeXOffset,
                        y: isTrackingInput && isTyping
                          ? [eyeYOffset, eyeYOffset - 0.4, eyeYOffset + 0.4, eyeYOffset]
                          : eyeYOffset,
                        scaleY: isIdle && !isTrackingInput && (mouseCoords.x === 0 && mouseCoords.y === 0)
                          ? [1, 1, 0.05, 1, 1]
                          : 1,
                      }
                    : { x: eyeXOffset, y: eyeYOffset }
                }
                transition={
                  isTrackingInput && isTyping
                    ? {
                        repeat: Infinity,
                        duration: 0.15,
                        ease: 'easeInOut',
                      }
                    : isIdle && !isTrackingInput && (mouseCoords.x === 0 && mouseCoords.y === 0)
                    ? {
                        repeat: Infinity,
                        repeatDelay: 4.5,
                        duration: 3,
                        ease: 'easeInOut',
                      }
                    : { duration: 0.15, ease: 'easeOut' }
                }
              />
            )}

            {/* Circular HUD Scan Rings on Visor when active/decrypting */}
            {((isPassword && showPassword) || isTyping) && (
              <g stroke={eyeColor} strokeWidth="1" strokeOpacity="0.25">
                <circle cx="80" cy="79" r="16" strokeDasharray="4 4" />
                <line x1="80" y1="62" x2="80" y2="96" />
                <line x1="62" y1="79" x2="98" y2="79" />
              </g>
            )}
          </g>

          {/* VISUAL ADDITION: Blinking status indicator LED on lower face */}
          <motion.circle
            cx="80"
            cy="112"
            r="2.5"
            fill={eyeColor}
            animate={
              shouldAnimate
                ? {
                    opacity: isWeak || isError ? [0.2, 1, 0.2] : [0.5, 1, 0.5],
                  }
                : {}
            }
            transition={{
              repeat: Infinity,
              duration: isWeak ? 0.3 : isError ? 0.15 : isTyping ? 0.5 : 2.5,
              ease: 'easeInOut',
            }}
          />

          {/* Visor UI corner ticks */}
          <rect x="110" y="86" width="6" height="6" rx="1" fill="#ef4444" opacity={isError ? 0.95 : 0.15} />
          <rect x="44" y="86" width="6" height="6" rx="1" fill={isValid || isSuccess ? '#10b981' : '#3b82f6'} opacity={0.3} />

          {/* Floating Lower Shield Plate */}
          <path
            d="M50 134 L110 134 L120 142 L40 142 Z"
            fill="#1e202b"
            stroke="#2d303f"
            strokeWidth="1.5"
          />
          <line x1="70" y1="138" x2="90" y2="138" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
        </motion.svg>
      </div>

      {/* VISUAL ADDITION: Animated status text container using AnimatePresence */}
      <div className="text-center font-mono h-6 flex items-center justify-center space-x-1 select-none w-full">
        <span className="text-[10px] tracking-widest text-white/30 font-black uppercase">
          STAGE Status:
        </span>
        <div className="relative overflow-hidden h-4 w-28 flex items-center justify-start">
          <AnimatePresence mode="wait">
            <motion.span
              key={state + (isPassword ? `-${showPassword}` : '')}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeInOut' }}
              className="text-[10px] font-bold tracking-widest uppercase absolute left-0 leading-none"
              style={{ color: statusTextColor }}
            >
              {statusLabel}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
