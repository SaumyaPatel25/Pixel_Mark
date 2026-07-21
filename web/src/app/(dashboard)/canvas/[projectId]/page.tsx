'use client'

import React from 'react'
import { LayoutGrid, Wrench, ShieldCheck } from 'lucide-react'

export default function CanvasPage() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#090d16] text-white p-6 relative overflow-hidden">
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-transparent to-purple-950/20 pointer-events-none" />

      <div className="max-w-md w-full bg-[#0f172a]/80 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide mb-6">
          <Wrench className="w-3.5 h-3.5" />
          <span>Rebuild in progress</span>
        </div>

        {/* Heading */}
        <div className="flex items-center gap-3 mb-3">
          <LayoutGrid className="w-7 h-7 text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-tight text-white">Blueprint Canvas</h1>
        </div>

        {/* Main Body */}
        <p className="text-base text-slate-300 font-medium mb-4">
          This workspace is being rebuilt from scratch.
        </p>

        {/* Subtext */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-left w-full mt-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Session canvas, review flows, and existing audit tools are untouched.
          </span>
        </div>
      </div>
    </div>
  )
}
