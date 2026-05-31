'use client'

import React, { useEffect, useState, useRef } from 'react'
import { motion, useSpring, useMotionValue, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export const CustomCursor = () => {
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    
    // Dot Physics (Fast)
    const dotX = useSpring(mouseX, { stiffness: 800, damping: 35, mass: 0.5 })
    const dotY = useSpring(mouseY, { stiffness: 800, damping: 35, mass: 0.5 })
    
    // Ring Physics (Lagging)
    const ringX = useSpring(mouseX, { stiffness: 400, damping: 28 })
    const ringY = useSpring(mouseY, { stiffness: 400, damping: 28 })
    
    const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null)
    const [isPointer, setIsPointer] = useState(false)
    const [isClicking, setIsClicking] = useState(false)
    const [ripples, setRipples] = useState<{ id: string; x: number; y: number }[]>([])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX)
            mouseY.set(e.clientY)
        }

        const handleMouseOver = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('button, a, .magnetic') as HTMLElement
            if (target) {
                setHoveredRect(target.getBoundingClientRect())
                setIsPointer(true)
            } else {
                setHoveredRect(null)
                setIsPointer(false)
            }
        }

        const handleMouseDown = () => setIsClicking(true)
        const handleMouseUp = () => setIsClicking(false)

        const handleClick = (e: MouseEvent) => {
            const id = crypto.randomUUID()
            setRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY }])
            setTimeout(() => {
                setRipples(prev => prev.filter(r => r.id !== id))
            }, 600)
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseover', handleMouseOver)
        window.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mouseup', handleMouseUp)
        window.addEventListener('click', handleClick)
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseover', handleMouseOver)
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            window.removeEventListener('click', handleClick)
        }
    }, [mouseX, mouseY])

    const ringVariants = {
        default: {
            scale: isClicking ? 0.8 : 1,
            width: 32,
            height: 32,
            borderRadius: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0)',
            border: isClicking ? '1px solid rgba(168, 85, 247, 0.6)' : '1px solid rgba(255, 255, 255, 0.2)',
            x: -16,
            y: -16,
        },
        magnetic: {
            scale: isClicking ? 0.95 : 1,
            width: hoveredRect?.width ? hoveredRect.width + 12 : 32,
            height: hoveredRect?.height ? hoveredRect.height + 12 : 32,
            borderRadius: hoveredRect ? getComputedStyle(document.activeElement || document.body).borderRadius || '12px' : '100%',
            backgroundColor: isClicking ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            border: isClicking ? '1px solid rgba(168, 85, 247, 0.6)' : '1px solid rgba(255, 255, 255, 0.4)',
            x: hoveredRect ? -((hoveredRect.width + 12) / 2) : -16,
            y: hoveredRect ? -((hoveredRect.height + 12) / 2) : -16,
        }
    }

    // Actual coordinates for the ring when magnetic
    const targetX = hoveredRect ? hoveredRect.left + hoveredRect.width / 2 : ringX
    const targetY = hoveredRect ? hoveredRect.top + hoveredRect.height / 2 : ringY

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
            {/* Click Ripples */}
            <AnimatePresence>
                {ripples.map((ripple) => (
                    <motion.div
                        key={ripple.id}
                        initial={{ opacity: 0.6, scale: 0, x: ripple.x, y: ripple.y, translateX: '-50%', translateY: '-50%' }}
                        animate={{ opacity: 0, scale: 1.2 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute w-12 h-12 rounded-full border border-purple-500/60 pointer-events-none shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    />
                ))}
            </AnimatePresence>

            {/* The Fast Dot */}
            <motion.div 
                style={{ x: dotX, y: dotY, translateX: '-50%', translateY: '-50%' }}
                animate={{ scale: isClicking ? 0.6 : 1 }}
                className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.4)]"
            />
            
            {/* The Magnetic Ring */}
            <motion.div 
                animate={hoveredRect ? 'magnetic' : 'default'}
                variants={ringVariants}
                style={{ 
                    x: hoveredRect ? hoveredRect.left + hoveredRect.width / 2 : ringX, 
                    y: hoveredRect ? hoveredRect.top + hoveredRect.height / 2 : ringY,
                    translateX: hoveredRect ? -((hoveredRect.width + 12) / 2) : -16,
                    translateY: hoveredRect ? -((hoveredRect.height + 12) / 2) : -16,
                }}
                transition={{ type: "spring", stiffness: 450, damping: 25, mass: 1 }}
                className="absolute transition-colors duration-300"
            />

            {/* Glowing Flare on click */}
            <motion.div 
                style={{ x: dotX, y: dotY, translateX: '-50%', translateY: '-50%' }}
                className="w-20 h-20 bg-purple-500/10 blur-xl rounded-full"
            />
        </div>
    )
}
