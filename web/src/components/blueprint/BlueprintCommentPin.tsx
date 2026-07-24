'use client'

import React from 'react'
import { MessageSquare, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlueprintComment } from '@/store/blueprintCollaborationStore'

interface BlueprintCommentPinProps {
  comment: BlueprintComment
  index: number
  position: { left: number; top: number }
  isActive?: boolean
  onClick?: () => void
}

export function BlueprintCommentPin({
  comment,
  index,
  position,
  isActive = false,
  onClick
}: BlueprintCommentPinProps) {
  const isResolved = comment.status === 'resolved'
  const replyCount = comment.replies?.length || 0

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.left}px`,
        top: `${position.top}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: isActive ? 40 : 30,
        pointerEvents: 'auto'
      }}
      className="group cursor-pointer select-none"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      title={`STAGE Blueprint Comment by ${comment.author_name || 'Reviewer'}: ${comment.body.slice(0, 40)}...`}
    >
      <div className={cn(
        "relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-xl transition-all duration-200",
        isResolved
          ? "bg-slate-900/90 border-slate-700 text-slate-400 opacity-75 hover:opacity-100"
          : isActive
            ? "bg-indigo-600 border-indigo-400 text-white ring-4 ring-indigo-500/30 scale-110"
            : "bg-[#0f0f18]/95 border-indigo-500/40 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-950/40 hover:scale-105"
      )}>
        {isResolved ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
        ) : (
          <MessageSquare className="w-3 h-3 text-indigo-400 flex-shrink-0 animate-pulse" />
        )}

        <span className="text-[10px] font-black font-mono">
          #{index}
        </span>

        {replyCount > 0 && (
          <span className="ml-0.5 px-1 rounded-full bg-indigo-500/20 text-[8px] font-bold text-indigo-300">
            +{replyCount}
          </span>
        )}

        {/* Hover preview tooltip */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:flex flex-col gap-1 w-52 p-2.5 rounded-xl bg-[#0a0a12]/95 border border-indigo-500/30 text-white shadow-2xl z-50 pointer-events-none animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
            <span>{comment.author_name || 'STAGE Reviewer'}</span>
            <span className="text-white/40 font-mono text-[8px]">{isResolved ? 'Resolved' : 'Open'}</span>
          </div>
          <p className="text-[10px] text-white/80 line-clamp-2 leading-relaxed font-normal">
            {comment.body}
          </p>
          {comment.target_selector && (
            <span className="text-[8px] font-mono text-white/30 truncate">
              {comment.target_selector}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
