'use client'

import React, { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion'

interface SplineBackgroundProps {
  hoveredPosition?: { x: number; y: number } | null;
  isHeroTextComplete?: boolean;
}

interface CardConfig {
    id: number;
    name: string;
    icon: React.ReactNode;
    bg: string;
    border: string;
    shadow: string;
    glowColor: string;
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
    depth: 'fg' | 'mid' | 'bg';
    driftDuration: number;
    driftDelay: number;
    idleAnimate?: any;
    idleTransition?: any;
}

export const SplineBackground = ({ hoveredPosition, isHeroTextComplete = false }: SplineBackgroundProps) => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isInView, setIsInView] = useState(true)

    // Motion values for subtle hover parallax (ranging from -1 to 1)
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Highly-damped, premium spring values to avoid "hover toy" snap feel
    const parallaxSpringX = useSpring(mouseX, { stiffness: 8, damping: 28, mass: 3 })
    const parallaxSpringY = useSpring(mouseY, { stiffness: 8, damping: 28, mass: 3 })

    // --- Parallax offsets for the 3 distinct depth planes ---
    const fgX = useTransform(parallaxSpringX, [-1, 1], [-24, 24])
    const fgY = useTransform(parallaxSpringY, [-1, 1], [-24, 24])
    const midX = useTransform(parallaxSpringX, [-1, 1], [-12, 12])
    const midY = useTransform(parallaxSpringY, [-1, 1], [-12, 12])
    const bgX = useTransform(parallaxSpringX, [-1, 1], [-6, 6])
    const bgY = useTransform(parallaxSpringY, [-1, 1], [-6, 6])

    // --- Soft Atmospheric Illumination Gradient mapping ---
    const lightX = useTransform(parallaxSpringX, [-1, 1], [30, 70])
    const lightY = useTransform(parallaxSpringY, [-1, 1], [30, 70])
    const lightBg = useMotionTemplate`radial-gradient(1200px circle at ${lightX}% ${lightY}%, rgba(252, 226, 225, 0.08) 0%, rgba(199, 180, 214, 0.05) 45%, rgba(208, 231, 230, 0.03) 75%, transparent 100%)`

    // Synchronize hover state updates from parent elements
    useEffect(() => {
        if (hoveredPosition) {
            mouseX.set(hoveredPosition.x * 2);
            mouseY.set(hoveredPosition.y * 2);
        }
    }, [hoveredPosition, mouseX, mouseY]);

    useEffect(() => {
        // Reduced motion detection
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(motionQuery.matches)
        const motionHandler = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches)
            if (e.matches) {
                mouseX.set(0)
                mouseY.set(0)
            }
        }
        motionQuery.addEventListener('change', motionHandler)

        // Mobile check (hide elements on mobile to preserve layout integrity)
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)

        const container = document.getElementById('hero-section')
        const activeContainer = container || document.body

        let rafId: number | null = null
        const handlePointerMove = (e: PointerEvent) => {
            if (motionQuery.matches || window.innerWidth < 768 || hoveredPosition) return
            
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(() => {
                const rect = activeContainer.getBoundingClientRect()
                const xVal = e.clientX - rect.left
                const yVal = e.clientY - rect.top
                const normX = (xVal / rect.width) * 2 - 1
                const normY = (yVal / rect.height) * 2 - 1
                
                const clampedX = Math.max(-1, Math.min(1, normX))
                const clampedY = Math.max(-1, Math.min(1, normY))
                
                mouseX.set(clampedX)
                mouseY.set(clampedY)
            })
        }

        const handlePointerLeave = () => {
            if (hoveredPosition) return
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(() => {
                mouseX.set(0)
                mouseY.set(0)
            })
        }

        activeContainer.addEventListener('pointermove', handlePointerMove, { passive: true })
        activeContainer.addEventListener('pointerleave', handlePointerLeave, { passive: true })

        // IntersectionObserver to pause idle checks when viewport scrolls
        const io = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting)
            },
            { threshold: 0.02 }
        )
        if (container) io.observe(container)

        return () => {
            motionQuery.removeEventListener('change', motionHandler)
            window.removeEventListener('resize', checkMobile)
            if (rafId) cancelAnimationFrame(rafId)
            activeContainer.removeEventListener('pointermove', handlePointerMove)
            activeContainer.removeEventListener('pointerleave', handlePointerLeave)
            io.disconnect()
        }
    }, [mouseX, mouseY, hoveredPosition])

    // Scattered PixelMark-native visual system icons explaining core product features
    const cards: CardConfig[] = [
        // --- Left Column / Margin Elements ---
        {
            id: 1,
            name: 'Marker Pin',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="#1D264F" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="3" fill="#1D264F" />
                    <path d="M12 3V5M12 19V21M3 12H5M19 12H21" stroke="#1D264F" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            ),
            bg: 'bg-white/85 dark:bg-[#1D264F]/85 backdrop-blur-md',
            border: 'border-indigo-100/80 dark:border-indigo-900/30',
            shadow: 'shadow-[0_12px_28px_rgba(29,38,79,0.04)]',
            glowColor: 'bg-indigo-400',
            left: '5%',
            top: '22%',
            depth: 'bg',
            driftDuration: 28,
            driftDelay: 0,
            idleAnimate: {
                y: [0, -12, 6, 0],
                x: [0, 8, -4, 0],
                rotateZ: [-3, -1, -5, -3],
                rotateX: [8, 9.5, 6.5, 8],
                rotateY: [12, 13.5, 10.5, 12]
            },
            idleTransition: {
                duration: 18,
                repeat: Infinity,
                ease: 'easeInOut' as const
            }
        },
        {
            id: 2,
            name: 'Selection Frame',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="16" height="16" rx="2" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3 3" />
                    <rect x="2" y="2" width="4" height="4" rx="1" fill="#3B82F6" />
                    <rect x="18" y="2" width="4" height="4" rx="1" fill="#3B82F6" />
                    <rect x="2" y="18" width="4" height="4" rx="1" fill="#3B82F6" />
                    <rect x="18" y="18" width="4" height="4" rx="1" fill="#3B82F6" />
                </svg>
            ),
            bg: 'bg-white/85 dark:bg-[#1D264F]/85 backdrop-blur-md',
            border: 'border-blue-100/80 dark:border-blue-900/30',
            shadow: 'shadow-[0_12px_28px_rgba(59,130,246,0.04)]',
            glowColor: 'bg-blue-400',
            left: '17%',
            top: '14%',
            depth: 'mid',
            driftDuration: 22,
            driftDelay: 2,
            idleAnimate: {
                y: [0, 10, -8, 0],
                x: [0, -6, 12, 0],
                scale: [1, 1.025, 0.975, 1],
                rotateX: [8, 6.5, 9.5, 8],
                rotateY: [12, 10.5, 13.5, 12],
                rotateZ: [-3, -4.5, -1.5, -3]
            },
            idleTransition: {
                duration: 22,
                repeat: Infinity,
                ease: 'easeInOut' as const
            }
        },
        {
            id: 3,
            name: 'Feedback Bubble',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 11.5C21 15.6421 16.9706 19 12 19C10.5185 19 9.12435 18.6657 7.9 18.068L4 19L5.0315 15.9055C4.37583 14.6749 4 13.1537 4 11.5C4 7.35786 8.02944 4 12 4C15.9706 4 21 7.35786 21 11.5Z" stroke="#EF4444" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="9" cy="11.5" r="1" fill="#EF4444" />
                    <circle cx="12" cy="11.5" r="1" fill="#EF4444" />
                    <circle cx="15" cy="11.5" r="1" fill="#EF4444" />
                </svg>
            ),
            bg: 'bg-white/85 dark:bg-[#1D264F]/85 backdrop-blur-md',
            border: 'border-rose-100/80 dark:border-rose-900/30',
            shadow: 'shadow-[0_12px_28px_rgba(239,68,68,0.04)]',
            glowColor: 'bg-rose-400',
            left: '5%',
            top: '45%',
            depth: 'fg',
            driftDuration: 24,
            driftDelay: 4,
            idleAnimate: {
                y: [0, -15, 10, 0],
                x: [0, 12, -8, 0],
                scale: [1, 0.98, 1.02, 1],
                rotateX: [8, 9.5, 6.5, 8],
                rotateY: [12, 13.5, 10.5, 12],
                rotateZ: [-3, -5, -1, -3]
            },
            idleTransition: {
                duration: 20,
                repeat: Infinity,
                ease: 'easeInOut' as const
            }
        },
        {
            id: 4,
            name: 'Reviewer Identity',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="6" width="18" height="12" rx="6" stroke="#8B5CF6" strokeWidth="1.5" />
                    <circle cx="9" cy="12" r="3" stroke="#8B5CF6" strokeWidth="1.5" />
                    <path d="M15 11H18M15 13H17" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            ),
            bg: 'bg-white/85 dark:bg-[#1D264F]/85 backdrop-blur-md',
            border: 'border-violet-100/80 dark:border-violet-900/30',
            shadow: 'shadow-[0_12px_28px_rgba(139,92,246,0.04)]',
            glowColor: 'bg-violet-400',
            left: '16%',
            bottom: '22%',
            depth: 'mid',
            driftDuration: 26,
            driftDelay: 1,
            idleAnimate: {
                y: [0, -10, 12, 0],
                x: [0, 14, -14, 0],
                rotateX: [8, 6.5, 9.5, 8],
                rotateY: [12, 10.5, 13.5, 12],
                rotateZ: [-3, -1.5, -4.5, -3]
            },
            idleTransition: {
                duration: 24,
                repeat: Infinity,
                ease: 'easeInOut' as const
            }
        },
        {
            id: 5,
            name: 'Sync Pulse',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="2" fill="#10B981" />
                    <circle cx="12" cy="12" r="6" stroke="#10B981" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.4" />
                </svg>
            ),
            bg: 'bg-white/85 dark:bg-[#1D264F]/85 backdrop-blur-md',
            border: 'border-emerald-100/80 dark:border-emerald-900/30',
            shadow: 'shadow-[0_12px_28px_rgba(16,185,129,0.04)]',
            glowColor: 'bg-emerald-400',
            left: '6%',
            bottom: '10%',
            depth: 'fg',
            driftDuration: 30,
            driftDelay: 3,
            idleAnimate: {
                y: [0, 12, -14, 0],
                x: [0, -10, 8, 0],
                rotateZ: [-3, 2, -8, -3],
                rotateX: [8, 9.5, 6.5, 8],
                rotateY: [12, 13.5, 10.5, 12]
            },
            idleTransition: {
                duration: 19,
                repeat: Infinity,
                ease: 'easeInOut' as const
            }
        },

        // --- Right Column / Margin Elements ---
        {
            id: 6,
            name: 'Drag Handle',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="9" cy="8" r="1.5" fill="#3B82F6" />
                    <circle cx="15" cy="8" r="1.5" fill="#3B82F6" />
                    <circle cx="9" cy="12" r="1.5" fill="#3B82F6" />
                    <circle cx="15" cy="12" r="1.5" fill="#3B82F6" />
                    <circle cx="9" cy="16" r="1.5" fill="#3B82F6" />
                    <circle cx="15" cy="16" r="1.5" fill="#3B82F6" />
                </svg>
            ),
            bg: 'bg-white/85 dark:bg-[#1D264F]/85 backdrop-blur-md',
            border: 'border-blue-100/80 dark:border-blue-900/30',
            shadow: 'shadow-[0_12px_28px_rgba(59,130,246,0.04)]',
            glowColor: 'bg-blue-400',
            right: '8%',
            top: '12%',
            depth: 'fg',
            driftDuration: 24,
            driftDelay: 5,
            idleAnimate: {
                y: [0, -14, 8, 0],
                x: [0, -12, 10, 0],
                rotateZ: [3, 1.5, 4.5, 3],
                rotateX: [8, 9.5, 6.5, 8],
                rotateY: [-12, -13.5, -10.5, -12]
            },
            idleTransition: {
                duration: 21,
                repeat: Infinity,
                ease: 'easeInOut' as const
            }
        },
        {
            id: 7,
            name: 'Presence Node',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="12" r="4" stroke="#C084FC" strokeWidth="1.5" />
                    <circle cx="16" cy="12" r="4" stroke="#C084FC" strokeWidth="1.5" />
                    <path d="M11 12H13" stroke="#C084FC" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            ),
            bg: 'bg-white/85 dark:bg-[#1D264F]/85 backdrop-blur-md',
            border: 'border-purple-100/80 dark:border-purple-900/30',
            shadow: 'shadow-[0_12px_28px_rgba(109,40,217,0.04)]',
            glowColor: 'bg-purple-400',
            right: '15%',
            top: '28%',
            depth: 'mid',
            driftDuration: 20,
            driftDelay: 1,
            idleAnimate: {
                y: [0, -10, 12, 0],
                x: [0, 10, -12, 0],
                scale: [1, 1.02, 0.98, 1],
                rotateX: [8, 6.5, 9.5, 8],
                rotateY: [-12, -10.5, -13.5, -12],
                rotateZ: [3, 4.5, 1.5, 3]
            },
            idleTransition: {
                duration: 23,
                repeat: Infinity,
                ease: 'easeInOut' as const
            }
        },
        {
            id: 8,
            name: 'Resolve Mark',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="#22C55E" strokeWidth="1.5" />
                    <path d="M8.5 12.5L11 15L15.5 9.5" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            bg: 'bg-white/85 dark:bg-[#1D264F]/85 backdrop-blur-md',
            border: 'border-green-100/80 dark:border-green-900/30',
            shadow: 'shadow-[0_12px_28px_rgba(34,197,94,0.04)]',
            glowColor: 'bg-green-400',
            right: '6%',
            top: '42%',
            depth: 'bg',
            driftDuration: 32,
            driftDelay: 2,
            idleAnimate: {
                y: [0, -16, 12, 0],
                x: [0, -14, 8, 0],
                scale: [1, 1.04, 0.96, 1],
                rotateX: [8, 9.5, 6.5, 8],
                rotateY: [-12, -13.5, -10.5, -12],
                rotateZ: [3, 1.5, 4.5, 3]
            },
            idleTransition: {
                duration: 25,
                repeat: Infinity,
                ease: 'easeInOut' as const
            }
        },
        {
            id: 9,
            name: 'Feedback Layers',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4L4 8L12 12L20 8L12 4Z" stroke="#6366F1" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M4 12L12 16L20 12" stroke="#6366F1" strokeWidth="1.5" strokeLinejoin="round" strokeOpacity="0.7" />
                    <path d="M4 16L12 20L20 16" stroke="#6366F1" strokeWidth="1.5" strokeLinejoin="round" strokeOpacity="0.4" />
                </svg>
            ),
            bg: 'bg-white/85 dark:bg-[#1D264F]/85 backdrop-blur-md',
            border: 'border-indigo-100/80 dark:border-indigo-900/30',
            shadow: 'shadow-[0_12px_28px_rgba(99,102,241,0.04)]',
            glowColor: 'bg-indigo-400',
            right: '18%',
            bottom: '26%',
            depth: 'mid',
            driftDuration: 25,
            driftDelay: 4,
            idleAnimate: {
                y: [0, 14, -10, 0],
                x: [0, 12, -15, 0],
                rotateX: [6, 10, 6],
                rotateY: [-10, -14, -10],
                rotateZ: [3, 4.5, 1.5, 3]
            },
            idleTransition: {
                duration: 20,
                repeat: Infinity,
                ease: 'easeInOut' as const
            }
        },
        {
            id: 10,
            name: 'Share Link',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 10.5L19 5M10.5 13.5L5 19" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="19" cy="5" r="3" stroke="#A855F7" strokeWidth="1.5" fill="white" />
                    <circle cx="5" cy="19" r="3" stroke="#A855F7" strokeWidth="1.5" fill="white" />
                    <circle cx="12" cy="12" r="3" fill="#A855F7" />
                </svg>
            ),
            bg: 'bg-white/85 dark:bg-[#1D264F]/85 backdrop-blur-md',
            border: 'border-purple-100/80 dark:border-purple-900/30',
            shadow: 'shadow-[0_12px_28px_rgba(168,85,247,0.04)]',
            glowColor: 'bg-purple-400',
            right: '6%',
            bottom: '10%',
            depth: 'fg',
            driftDuration: 27,
            driftDelay: 0,
            idleAnimate: {
                y: [0, -12, 14, 0],
                x: [0, -8, 12, 0],
                rotateZ: [3, 6.5, -0.5, 3],
                rotateX: [8, 9.5, 6.5, 8],
                rotateY: [-12, -13.5, -10.5, -12]
            },
            idleTransition: {
                duration: 19,
                repeat: Infinity,
                ease: 'easeInOut' as const
            }
        }
    ]

    // Calculates the offset needed to pull a card from its absolute scattered layout positions
    // to the visual center coordinates of the sandbox (approx 50vw, 65vh).
    const getCenterOffset = (card: CardConfig) => {
        let cx = '0px';
        let cy = '0px';

        if (card.left) {
            const val = parseFloat(card.left);
            cx = `calc(50vw - ${val}vw - 48px)`;
        } else if (card.right) {
            const val = parseFloat(card.right);
            cx = `calc(-50vw + ${val}vw + 48px)`;
        }

        if (card.top) {
            const val = parseFloat(card.top);
            cy = `calc(65vh - ${val}vh - 48px)`;
        } else if (card.bottom) {
            const val = parseFloat(card.bottom);
            cy = `calc(-35vh + ${val}vh + 48px)`;
        }

        return { cx, cy };
    }

    // Build the Framer Motion variants mapping for the burst explosion out of the sandbox
    const getCardVariants = (card: CardConfig) => {
        const { cx, cy } = getCenterOffset(card)
        const isLeft = !!card.left;
        const defaultRotateX = 8;
        const defaultRotateY = isLeft ? 12 : -12;
        const defaultRotateZ = isLeft ? -3 : 3;

        return {
            collapsed: {
                x: cx,
                y: cy,
                scale: 0,
                opacity: 0,
                rotateX: 0,
                rotateY: 0,
                rotateZ: 0
            },
            burst: {
                x: '0px',
                y: '0px',
                scale: 1,
                opacity: 1,
                rotateX: defaultRotateX,
                rotateY: defaultRotateY,
                rotateZ: defaultRotateZ,
                transition: {
                    type: 'spring' as const,
                    stiffness: 65,
                    damping: 14,
                    mass: 0.8,
                    delay: card.id * 0.045 // Rapid staggered burst trigger
                }
            }
        }
    }

    // Render mobile layout statically
    if (isMobile) {
        return (
            <div className="fixed inset-0 w-full h-full z-0 bg-[var(--pm-bg)] transition-colors duration-500 overflow-hidden" />
        )
    }

    return (
        <div 
            className="fixed inset-0 w-full h-full z-0 bg-[var(--pm-bg)] pointer-events-none overflow-hidden transition-colors duration-500" 
            style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
        >
            {/* Ambient background gradients */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,var(--pm-bg)_95%)] z-10 pointer-events-none transition-colors duration-500" />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--pm-bg-trans-20)] via-[var(--pm-bg-trans-50)] to-[var(--pm-bg)] z-10 pointer-events-none transition-colors duration-500" />

            {/* Ambient Cursor-Following Spotlight */}
            <motion.div
                className="absolute inset-0 pointer-events-none transition-colors duration-500"
                style={{ background: lightBg, zIndex: 1 }}
            />

            {/* Scattered Mobbin-Inspired App/Integration Library Layer */}
            <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ transformStyle: 'preserve-3d', zIndex: 12 }}>
                {cards.map((card) => {
                    // Map depth to motion value offsets
                    const xOffset = card.depth === 'fg' ? fgX : card.depth === 'mid' ? midX : bgX
                    const yOffset = card.depth === 'fg' ? fgY : card.depth === 'mid' ? midY : bgY
                    
                    const cardVariants = getCardVariants(card)

                    return (
                        <motion.div
                            key={card.id}
                            initial="collapsed"
                            animate={isHeroTextComplete ? "burst" : "collapsed"}
                            variants={cardVariants}
                            style={{
                                position: 'absolute',
                                left: card.left,
                                right: card.right,
                                top: card.top,
                                bottom: card.bottom,
                                z: card.depth === 'fg' ? 180 : card.depth === 'mid' ? 60 : -100,
                                transformStyle: 'preserve-3d',
                                willChange: 'transform'
                            }}
                        >
                            {/* Nested Parallax Translation Container */}
                            <motion.div
                                style={{
                                    x: xOffset,
                                    y: yOffset,
                                    transformStyle: 'preserve-3d',
                                    willChange: 'transform'
                                }}
                            >
                                {/* Slow continuous drifting squircle block with custom dimensional animations */}
                                <motion.div
                                    animate={isInView && !prefersReducedMotion && isHeroTextComplete ? card.idleAnimate : {
                                        rotateX: card.left ? 8 : 8,
                                        rotateY: card.left ? 12 : -12,
                                        rotateZ: card.left ? -3 : 3,
                                        y: 0,
                                        scale: 1
                                    }}
                                    transition={card.idleTransition || {
                                        duration: card.driftDuration,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: card.driftDelay
                                    }}
                                    className={`w-[80px] h-[80px] md:w-[96px] md:h-[96px] rounded-[1.75rem] md:rounded-[2rem] border ${card.border} ${card.bg} ${card.shadow} flex items-center justify-center relative overflow-hidden`}
                                    style={{
                                        boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(0, 0, 0, 0.05), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.7), inset -1.5px -1.5px 3px rgba(29, 38, 79, 0.03), 0 16px 32px -12px rgba(29, 38, 79, 0.06)',
                                        transformStyle: 'preserve-3d',
                                        willChange: 'transform'
                                    }}
                                >
                                    {/* Soft dimensional radial gradient glow behind the SVG (3D layering) */}
                                    <div className={`absolute w-12 h-12 rounded-full filter blur-xl opacity-[0.14] ${card.glowColor} pointer-events-none`} style={{ transform: 'translateZ(-10px)' }} />

                                    {/* Glossy material overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
                                    
                                    {/* Branding Icon (3D layering) */}
                                    <div className="flex items-center justify-center" style={{ transform: 'translateZ(10px)' }}>
                                        {card.icon}
                                    </div>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
