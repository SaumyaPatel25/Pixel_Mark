'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Code, Table, Download, Copy, Check, X } from 'lucide-react'

type ExportFormat = 'markdown' | 'json' | 'csv'

interface Props {
  projectId: string
  projectName: string
  commentCount: number
  onClose: () => void
}

const FORMATS = [
  { 
    id: 'markdown' as ExportFormat, 
    label: 'Standard Markdown', 
    icon: <FileText className="w-5 h-5" />, 
    desc: 'Full audit report with executive summary and session data.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10'
  },
  { 
    id: 'json' as ExportFormat, 
    label: 'Structured JSON', 
    icon: <Code className="w-5 h-5" />, 
    desc: 'Pure data in structured format for CLI or automated tools.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10'
  },
  { 
    id: 'csv' as ExportFormat, 
    label: 'Spreadsheet (CSV)', 
    icon: <Table className="w-5 h-5" />, 
    desc: 'Clean table layout for import into Excel, Sheets, or Airtable.',
    color: 'text-green-400',
    bg: 'bg-green-500/10'
  },
]

export function ExportPanel({ projectId, projectName, commentCount, onClose }: Props) {
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8765'

  const download = async () => {
    if (!projectId || projectId === 'undefined') {
      console.error('[Export] projectId is missing or undefined')
      return
    }

    setDownloading(true)
    try {
      const url = `${BASE}/export?project_id=${projectId}&format=${format}`
      console.log('[Export] Fetching:', url)

      const token = typeof window !== 'undefined' ? localStorage.getItem('pm_token') : null
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(url, { headers })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message ?? `HTTP ${res.status}`)
      }

      const ext      = { markdown: 'md', json: 'json', csv: 'csv' }[format]
      const blob     = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      a.href         = downloadUrl
      a.download     = `pixelmark-export-${projectId.slice(0, 8)}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('[Export] Failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const copyMarkdown = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pm_token') : null
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res  = await fetch(`${BASE}/export?project_id=${projectId}&format=markdown`, { headers })
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('[Export] Copy failed')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(10px)' }}
      className="absolute top-24 right-8 z-[60] w-96 bg-[#121216]/95 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden"
    >
      <div className="p-8 pb-4">
        <div className="flex items-center justify-between mb-2">
           <div>
              <h3 className="text-xl font-black tracking-tighter text-white">Export Audit</h3>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Foundry Delivery Stream</p>
           </div>
           <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-white transition-all">
              <X className="w-5 h-5" />
           </button>
        </div>
        <div className="flex items-center gap-2 mt-4 p-2 px-3 rounded-full bg-white/5 border border-white/5 w-fit">
           <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7]" />
           <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{commentCount} Verified Audits • {projectName}</span>
        </div>
      </div>

      <div className="p-8 pt-4 space-y-3">
        {FORMATS.map(f => (
          <button 
            key={f.id} 
            onClick={() => setFormat(f.id)}
            className={`w-full text-left p-4 rounded-3xl border transition-all relative overflow-hidden group ${
              format === f.id ? `border-white/10 ${f.bg}` : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
          >
            {format === f.id && (
                <motion.div layoutId="active-bg" className="absolute inset-0 bg-white/5 -z-10" />
            )}
            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-black/40 border border-white/5 ${format === f.id ? f.color : 'text-white/20'}`}>
                {f.icon}
              </div>
              <div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${format === f.id ? 'text-white' : 'text-white/40'}`}>
                    {f.label}
                </div>
                <div className="text-[10px] text-white/20 font-medium leading-tight mt-1 pr-4">{f.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="px-8 pb-8 space-y-3">
        <button 
          onClick={download} 
          disabled={downloading}
          className="w-full h-14 bg-white text-black hover:bg-white/90 disabled:opacity-50 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
        >
          {downloading ? (
            <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> GENERATING...</>
          ) : (
            <><Download className="w-4 h-4" /> DOWNLOAD {format.toUpperCase()}</>
          )}
        </button>

        {format === 'markdown' && (
          <button 
            onClick={copyMarkdown}
            className="w-full h-14 bg-white/5 hover:bg-white/10 text-white/60 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 flex items-center justify-center gap-3"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'COPIED TO CLIPBOARD' : 'COPY MARKDOWN'}
          </button>
        )}
      </div>

      <div className="px-8 py-6 bg-white/[0.02] border-t border-white/[0.03] space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-white/20" />
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Enterprise Bridge</span>
            </div>
            <a href="#github-settings" className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[8px] font-black text-purple-400 uppercase tracking-widest hover:bg-purple-500/20 transition-all">
                Sync GitHub
            </a>
        </div>
      </div>
    </motion.div>
  )
}
