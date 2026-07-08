'use client'

import React, { Suspense, useState, useEffect } from 'react'
import Spline from '@splinetool/react-spline'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface SplineBackgroundProps {
  hoveredPosition?: { x: number; y: number } | null;
}

export const SplineBackground = ({ hoveredPosition }: SplineBackgroundProps) => {
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [splineApp, setSplineApp] = useState<any>(null)

    // Motion values for hover effect
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    const springX = useSpring(mouseX, { stiffness: 45, damping: 22 })
    const springY = useSpring(mouseY, { stiffness: 45, damping: 22 })

    // Parallax transformations
    const rotateX = useTransform(springY, [-0.5, 0.5], [3, -3])
    const rotateY = useTransform(springX, [-0.5, 0.5], [-3, 3])
    const translateX = useTransform(springX, [-0.5, 0.5], [-12, 12])
    const translateY = useTransform(springY, [-0.5, 0.5], [-12, 12])

    // Fallback transformations (declared at top level to obey Hook rules)
    const fallbackX1 = useTransform(springX, [-0.5, 0.5], [-30, 30])
    const fallbackY1 = useTransform(springY, [-0.5, 0.5], [-30, 30])
    const fallbackX2 = useTransform(springX, [-0.5, 0.5], [20, -20])
    const fallbackY2 = useTransform(springY, [-0.5, 0.5], [20, -20])

    const handleSplineLoad = (spline: any) => {
        setSplineApp(spline);
        setIsLoading(false);
    };

    // Update Spline variables when spring values change
    useEffect(() => {
        if (!splineApp) return;
        const unsubscribeX = springX.on('change', (val) => {
            try {
                splineApp.setVariable('mouseX', val);
            } catch(e) {}
        });
        const unsubscribeY = springY.on('change', (val) => {
            try {
                splineApp.setVariable('mouseY', val);
            } catch(e) {}
        });
        return () => {
            unsubscribeX();
            unsubscribeY();
        };
    }, [splineApp, springX, springY]);

    useEffect(() => {
        if (hoveredPosition) {
            mouseX.set(hoveredPosition.x);
            mouseY.set(hoveredPosition.y);
        }
    }, [hoveredPosition, mouseX, mouseY]);

    useEffect(() => {
        // Detect reduced motion preference
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(motionQuery.matches)
        const motionHandler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
        motionQuery.addEventListener('change', motionHandler)

        // Detect screen width (mobile)
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)

        // Mouse move listener for parallax
        const handleMouseMove = (e: MouseEvent) => {
            if (motionQuery.matches || window.innerWidth < 768 || hoveredPosition) return
            const x = (e.clientX / window.innerWidth) - 0.5
            const y = (e.clientY / window.innerHeight) - 0.5
            mouseX.set(x)
            mouseY.set(y)
        }
        window.addEventListener('mousemove', handleMouseMove)

        // Fallback timer if Spline takes too long
        const timer = setTimeout(() => {
            if (isLoading) {
                setHasError(true)
                setIsLoading(false)
            }
        }, 5500)

        return () => {
            motionQuery.removeEventListener('change', motionHandler)
            window.removeEventListener('resize', checkMobile)
            window.removeEventListener('mousemove', handleMouseMove)
            clearTimeout(timer)
        }
    }, [isLoading, mouseX, mouseY, hoveredPosition])

    // Render fallback CSS background if mobile, reduced motion, or error occurred
    const shouldRenderFallback = isMobile || prefersReducedMotion || hasError

    return (
        <div className="fixed inset-0 w-full h-full -z-10 bg-[var(--pm-bg)] pointer-events-none overflow-hidden transition-colors duration-500">
            {/* Dark background vignette gradient to guarantee text readability */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,var(--pm-bg)_90%)] z-10 pointer-events-none transition-colors duration-500" />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--pm-bg-trans-20)] via-[var(--pm-bg-trans-50)] to-[var(--pm-bg)] z-10 pointer-events-none transition-colors duration-500" />

            <AnimatePresence>
                {shouldRenderFallback ? (
                  <motion.div
                    key="fallback-bg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 w-full h-full bg-[var(--pm-bg)] transition-colors duration-500"
                  >
                    {/* Subtle, abstract radial glowing points reacting to mouse */}
                    <motion.div
                      style={{
                        x: fallbackX1,
                        y: fallbackY1,
                      }}
                      className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.06)_0%,transparent_60%)]"
                    />
                    <motion.div
                      style={{
                        x: fallbackX2,
                        y: fallbackY2,
                      }}
                      className="absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,rgba(6,182,212,0.04)_0%,transparent_50%)]"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="spline-scene"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ 
                      opacity: isLoading ? 0 : 1, 
                      scale: 1,
                    }}
                    style={{
                      rotateX: rotateX,
                      rotateY: rotateY,
                      x: translateX,
                      y: translateY
                    }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <Suspense fallback={null}>
                      <Spline 
                        scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" 
                        onLoad={handleSplineLoad}
                        onError={() => setHasError(true)}
                      />
                    </Suspense>
                  </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Overlay */}
            <AnimatePresence>
                {isLoading && !shouldRenderFallback && (
                    <motion.div 
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 z-20 bg-[var(--pm-bg)] flex items-center justify-center transition-colors duration-500"
                    >
                        <div className="flex flex-col items-center gap-4">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                                className="w-10 h-10 border-2 border-purple-500/10 border-t-purple-500/80 rounded-full"
                            />
                            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-pm-muted/40">Loading Scene...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
