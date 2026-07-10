'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { Marker } from '@/types/markers'

interface SessionActivityChartProps {
  markers: Marker[]
}

export default function SessionActivityChart({ markers }: SessionActivityChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const timelineData = useMemo(() => {
    if (!markers || markers.length === 0) return []

    // Sort markers by creation time ascending
    const sorted = [...markers].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const minTime = new Date(sorted[0].created_at).getTime()
    const maxTime = new Date(sorted[sorted.length - 1].created_at).getTime()

    // If all markers are created at the exact same millisecond or range is too small
    const timeDiff = maxTime - minTime
    const range = timeDiff > 60000 ? timeDiff : 3600000 // default to 1 hour if same time
    const start = timeDiff > 60000 ? minTime : maxTime - 3600000

    const interval = range / 5 // 6 points total

    const buckets = Array.from({ length: 6 }, (_, idx) => {
      const targetTime = start + idx * interval
      return {
        timestamp: targetTime,
        label: new Date(targetTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        dateLabel: new Date(targetTime).toLocaleDateString([], {
          month: 'short',
          day: 'numeric'
        }),
        count: 0,
        markers: [] as Marker[]
      }
    })

    // Assign markers to buckets
    sorted.forEach((m) => {
      const mTime = new Date(m.created_at).getTime()
      // Find closest bucket
      let closestIdx = 0
      let minDiff = Infinity
      buckets.forEach((b, idx) => {
        const diff = Math.abs(b.timestamp - mTime)
        if (diff < minDiff) {
          minDiff = diff
          closestIdx = idx
        }
      })
      buckets[closestIdx].count++
      buckets[closestIdx].markers.push(m)
    })

    return buckets
  }, [markers])

  const maxCount = useMemo(() => {
    if (timelineData.length === 0) return 0
    return Math.max(...timelineData.map((d) => d.count), 1)
  }, [timelineData])

  if (markers.length === 0 || timelineData.length === 0) {
    return (
      <div className="h-[150px] flex flex-col items-center justify-center text-center p-4">
        <AlertCircle className="w-5 h-5 text-slate-300 mb-2" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No activity yet</p>
      </div>
    )
  }

  // Chart dimensions for SVG
  const width = 500
  const height = 130
  const paddingLeft = 24
  const paddingRight = 24
  const paddingTop = 15
  const paddingBottom = 20

  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  // Calculate points for line path
  const points = timelineData.map((d, idx) => {
    const x = paddingLeft + (idx / (timelineData.length - 1)) * chartWidth
    const y = paddingTop + chartHeight - (d.count / maxCount) * chartHeight
    return { x, y }
  })

  // Build SVG path
  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  }, '')

  // Area path (closes at bottom)
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : ''

  // Position for the floating HTML tooltip
  const tooltipPos = hoveredIdx !== null ? points[hoveredIdx] : null
  const hoveredBucket = hoveredIdx !== null ? timelineData[hoveredIdx] : null

  return (
    <div className="space-y-4 select-none relative">
      {/* SVG Container with absolute-positioned HTML tooltip overlay */}
      <div className="relative w-full h-[155px] bg-slate-50/50 rounded-2xl p-2 border border-slate-100/50 flex flex-col justify-end">
        
        {/* Floating Tooltip */}
        <AnimatePresence>
          {tooltipPos && hoveredBucket && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 pointer-events-none bg-[#1E2022] text-white text-[10px] font-bold rounded-xl p-2.5 shadow-xl border border-white/10 flex flex-col gap-1 min-w-[100px]"
              style={{
                left: `${(tooltipPos.x / width) * 100}%`,
                top: `${(tooltipPos.y / height) * 100 - 45}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Tooltip Arrow */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1E2022] border-r border-b border-white/10 rotate-45" />
              
              <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-1">
                <span className="font-mono text-white/50">{hoveredBucket.label}</span>
                <span className="text-[9px] uppercase tracking-wider text-emerald-400">{hoveredBucket.dateLabel}</span>
              </div>
              <p className="text-xs font-black text-white mt-0.5 leading-none">
                {hoveredBucket.count} {hoveredBucket.count === 1 ? 'pin' : 'pins'} created
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#253B80" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#253B80" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#253B80" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#253B80" stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="hoverBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          {[0, 0.5, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * ratio
            return (
              <line
                key={idx}
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#253B80"
                strokeOpacity="0.06"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )
          })}

          {/* Area under the line */}
          {areaD && (
            <motion.path
              d={areaD}
              fill="url(#chartAreaGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}

          {/* Glowing vertical line overlay on hover */}
          {tooltipPos && (
            <line
              x1={tooltipPos.x}
              y1={paddingTop}
              x2={tooltipPos.x}
              y2={paddingTop + chartHeight}
              stroke="#253B80"
              strokeOpacity="0.15"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}

          {/* Vertical Bars */}
          {points.map((p, idx) => {
            const barWidth = 12
            const barHeight = paddingTop + chartHeight - p.y
            const isHovered = hoveredIdx === idx

            return (
              <rect
                key={idx}
                x={p.x - barWidth / 2}
                y={p.y}
                width={barWidth}
                height={barHeight}
                fill={isHovered ? 'url(#hoverBarGradient)' : 'url(#barGradient)'}
                rx="3.5"
                onMouseEnter={() => setHoveredIdx(idx)}
                className="transition-all duration-200 cursor-pointer"
              />
            )
          })}

          {/* The connecting trend line */}
          {pathD && (
            <motion.path
              d={pathD}
              fill="none"
              stroke="#253B80"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />
          )}

          {/* Hover highlight circle */}
          {tooltipPos && (
            <circle
              cx={tooltipPos.x}
              cy={tooltipPos.y}
              r="7"
              fill="#253B80"
              fillOpacity="0.12"
            />
          )}

          {/* Dots on line vertices */}
          {points.map((p, idx) => {
            const isHovered = hoveredIdx === idx
            return (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={isHovered ? '5' : '3.5'}
                fill={isHovered ? '#10B981' : '#FFFFFF'}
                stroke={isHovered ? '#FFFFFF' : '#253B80'}
                strokeWidth="2.5"
                onMouseEnter={() => setHoveredIdx(idx)}
                className="cursor-pointer transition-all duration-150 shadow-sm"
              />
            )
          })}

          {/* X Axis Labels */}
          {timelineData.map((d, idx) => {
            const x = paddingLeft + (idx / (timelineData.length - 1)) * chartWidth
            return (
              <g key={idx}>
                <text
                  x={x}
                  y={height - 8}
                  fill="#1E2022"
                  fillOpacity="0.4"
                  fontSize="7.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-sans font-mono"
                >
                  {d.label}
                </text>
                <text
                  x={x}
                  y={height - 1}
                  fill="#1E2022"
                  fillOpacity="0.25"
                  fontSize="6.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-sans uppercase"
                >
                  {d.dateLabel}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
