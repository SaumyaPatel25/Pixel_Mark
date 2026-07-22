'use client'
import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[STAGE ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex items-center justify-center p-8 bg-[#1a1a1f] border border-white/5 rounded-3xl text-white/50 text-sm flex-col gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 text-2xl">
            ⚠️
          </div>
          <div>
            <p className="font-black tracking-tight text-white mb-1">AUDIT ENGINE INTERRUPTED</p>
            <p className="text-[10px] uppercase tracking-widest opacity-60">A component crash was contained.</p>
          </div>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-xl shadow-purple-900/20"
          >
            Restart Pipeline
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
