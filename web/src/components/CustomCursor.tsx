'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';

export const CustomCursor = () => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    
    // Smooth physics for the entire cursor wrapper to lag organically
    const posX = useSpring(mouseX, { stiffness: 650, damping: 30 });
    const posY = useSpring(mouseY, { stiffness: 650, damping: 30 });
    
    const [isPointer, setIsPointer] = useState(false);
    const [isClicking, setIsClicking] = useState(false);
    const [ripples, setRipples] = useState<{ id: string; x: number; y: number }[]>([]);
    
    // Default to false and detect touch-only devices client-side to prevent hydration mismatches
    const [isMobile, setIsMobile] = useState(false);
    const [hasMoved, setHasMoved] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkMobileDevice = () => {
            // Check if hover capability is absent (touch-only mobile/tablets)
            // This keeps the cursor active on touch-enabled Windows laptops and hybrid desktops.
            const isTouchOnly = window.matchMedia('(hover: none)').matches;
            setIsMobile(isTouchOnly || window.innerWidth < 768);
        };

        checkMobileDevice();
        window.addEventListener('resize', checkMobileDevice);

        const handleMouseMove = (e: MouseEvent) => {
            // Round coordinates to prevent fractional sub-pixel rendering jitter
            mouseX.set(Math.round(e.clientX));
            mouseY.set(Math.round(e.clientY));
            
            // Mark as moved to fade the cursor in gracefully on first movement
            setHasMoved(true);
        };

        const handleMouseOver = (e: MouseEvent) => {
            // Identify standard hoverable target classes/nodes
            const target = (e.target as HTMLElement).closest('button, a, .magnetic, [role="button"]') as HTMLElement;
            setIsPointer(!!target);
        };

        const handleMouseDown = () => setIsClicking(true);
        const handleMouseUp = () => setIsClicking(false);

        const handleClick = (e: MouseEvent) => {
            const id = crypto.randomUUID();
            setRipples(prev => [...prev, { id, x: Math.round(e.clientX), y: Math.round(e.clientY) }]);
            setTimeout(() => {
                setRipples(prev => prev.filter(r => r.id !== id));
            }, 600);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseover', handleMouseOver);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('click', handleClick);
        
        return () => {
            window.removeEventListener('resize', checkMobileDevice);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseover', handleMouseOver);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('click', handleClick);
        };
    }, [mouseX, mouseY]);

    // Do not render custom cursor on mobile or touch-sensitive screens
    if (isMobile) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
            {/* Click Ripples */}
            <AnimatePresence>
                {ripples.map((ripple) => (
                    <motion.div
                        key={ripple.id}
                        initial={{ opacity: 0.6, scale: 0, x: ripple.x, y: ripple.y, translateX: '-50%', translateY: '-50%' }}
                        animate={{ opacity: 0, scale: 1.3 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute w-12 h-12 rounded-full border border-purple-500/60 pointer-events-none shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    />
                ))}
            </AnimatePresence>

            {/* Stable Cursor Wrapper */}
            <motion.div
                style={{ 
                    x: posX, 
                    y: posY,
                    translateX: '-50%',
                    translateY: '-50%',
                }}
                animate={{
                    scale: isClicking ? 0.85 : isPointer ? 1.25 : 1,
                    opacity: hasMoved ? 1 : 0
                }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="absolute w-10 h-10 pointer-events-none z-50 flex items-center justify-center"
            >
                {/* 1. Ambient Glow Layer (separate absolute layer) */}
                <div 
                    className={`absolute w-12 h-12 rounded-full blur-lg transition-all duration-300 pointer-events-none -z-10 ${
                        isClicking 
                          ? 'bg-purple-500/35 opacity-100 scale-90' 
                          : isPointer 
                          ? 'bg-purple-500/20 opacity-90 scale-110' 
                          : 'bg-purple-500/10 opacity-60 scale-100'
                    }`}
                />

                {/* 2. Outer Ring (locked circular geometry, border-radius 9999px) */}
                <div 
                    className={`w-7 h-7 rounded-[9999px] border transition-all duration-300 pointer-events-none ${
                        isClicking 
                          ? 'border-pm-accent bg-pm-accent/10 shadow-[0_0_10px_var(--pm-accent-glow)]' 
                          : isPointer 
                          ? 'border-pm-accent bg-transparent shadow-[0_0_8px_var(--pm-accent-glow)]' 
                          : 'border-pm-text/20 bg-transparent shadow-none'
                    }`}
                />

                {/* 3. Inner Dot (absolute centered child) */}
                <div 
                    className={`absolute w-1.5 h-1.5 rounded-full transition-all duration-300 pointer-events-none ${
                        isClicking 
                          ? 'bg-pm-accent scale-[0.6] shadow-[0_0_6px_var(--pm-accent-glow)]' 
                          : isPointer 
                          ? 'bg-pm-accent scale-125 shadow-[0_0_6px_var(--pm-accent-glow)]' 
                          : 'bg-pm-text shadow-[0_0_4px_var(--pm-text-faint)]'
                    }`}
                />
            </motion.div>
        </div>
    );
};
