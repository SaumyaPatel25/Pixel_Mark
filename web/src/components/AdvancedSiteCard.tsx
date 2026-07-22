'use client'

import React from 'react'
import { Sparkles, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  url: string
  projectId: string
  reason: 'advanced' | 'failed' | 'loading' | 'ok' | string
}

export function AdvancedSiteCard({ url, projectId, reason }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(projectId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    window.open(url, '_blank')
  }

  const isAdvanced = reason === 'advanced'

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-3xl z-30 p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md space-y-8"
      >
        <div className="relative mx-auto w-24 h-24">
          <div className={`absolute inset-0 rounded-[32px] blur-2xl opacity-20 animate-pulse ${isAdvanced ? 'bg-purple-500' : 'bg-rose-500'}`} />
          <div className={`relative w-24 h-24 rounded-[32px] border flex items-center justify-center shadow-2xl ${isAdvanced ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
            {isAdvanced ? <Sparkles className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-2xl font-black text-white tracking-tight uppercase">
            {isAdvanced ? 'Contextual Enrichment Required' : 'Audit Tunnel Restricted'}
          </h3>
          <p className="text-white/40 text-[11px] font-bold uppercase leading-relaxed tracking-[0.15em] px-4">
            {isAdvanced 
              ? 'This environment leverages WebGL or 3D rendering. Use the STAGE Lens extension to annotate this high-fidelity interface directly.'
              : 'External security headers are blocking our proxy safely. Transition to the STAGE Lens extension for deep-layer inspection.'}
          </p>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
           <div className="flex flex-col gap-3">
              <Button 
                onClick={handleCopy}
                variant="vibrant"
                className="w-full h-14 rounded-2xl font-black text-[11px] tracking-widest nexus-shadow group relative overflow-hidden"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {copied ? <Check className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                  {copied ? 'PROJECT ID COPIED' : 'OPEN SITE + COPY PROJECT ID'}
                </div>
                {!copied && (
                  <motion.div 
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </Button>
              
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                 <div className="flex flex-col items-start gap-1">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Active Project ID</span>
                    <span className="text-xs font-mono font-bold text-white/60">{projectId}</span>
                 </div>
                 <button onClick={handleCopy} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-white/60">
                    <Copy className="w-4 h-4" />
                 </button>
              </div>
           </div>

           <div className="space-y-2">
              <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.2em]">
                 INSTRUCTIONS
              </p>
              <p className="text-white/10 text-[9px] font-bold leading-relaxed tracking-wider">
                 1. Open STAGE Lens on the target site<br/>
                 2. Paste Project ID & Sync Session<br/>
                 3. Markers sync back here in real-time
              </p>
           </div>
        </div>
      </motion.div>
    </div>
  )
}
