'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Calendar, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Share2, 
  Download, 
  X,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Loader2
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function ReviewReportPage() {
  const params = useParams()
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : ''

  const [report, setReport] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    let active = true
    async function loadData() {
      try {
        const data = await api.sessions.getReport(sessionId)
        if (active) {
          setReport(data)
          setError(null)
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Report not found or has been revoked.')
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    // 15-second polling interval for real-time status updates
    const interval = setInterval(loadData, 15000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [sessionId])

  const handleCopyLink = () => {
    const reportUrl = window.location.href
    navigator.clipboard.writeText(reportUrl)
      .then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 3000)
      })
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        <p className="text-xs font-mono tracking-widest text-white/40 uppercase">Loading Review Report substrate...</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-rose-500" />
        <h2 className="text-xl font-black uppercase tracking-widest text-white">Review Report Unavailable</h2>
        <p className="text-xs text-white/40 max-w-md leading-relaxed uppercase tracking-wider font-bold">
          {error || 'The requested review report does not exist or has been archived.'}
        </p>
      </div>
    )
  }

  const formattedDate = report.created_at
    ? new Date(report.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A'

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 md:p-12 font-sans overflow-x-hidden relative selection:bg-purple-500/30 print:bg-white print:text-black">
      
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body, html, .min-h-screen {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-hidden {
            display: none !important;
          }
          .print-card {
            background: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
          .print-badge-critical {
            background: #fef2f2 !important;
            color: #991b1b !important;
            border: 1px solid #fee2e2 !important;
          }
          .print-badge-work {
            background: #fffbeb !important;
            color: #92400e !important;
            border: 1px solid #fef3c7 !important;
          }
          .print-badge-good {
            background: #f0fdf4 !important;
            color: #166534 !important;
            border: 1px solid #dcfce7 !important;
          }
          .print-text-dark {
            color: #111827 !important;
          }
          .print-text-muted {
            color: #4b5563 !important;
          }
          .print-border {
            border-color: #e5e7eb !important;
          }
        }
      ` }} />

      {/* Tech Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20 print:hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, #312e81 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 print:space-y-6">
        
        {/* ================= HEADER ZONE ================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.04] pb-6 print:border-b print:border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full print:border-purple-200 print:text-purple-700">
                Visual Review Report
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md animate-pulse print:hidden">
                Live updates active
              </span>
            </div>
            
            <h1 className="text-3xl font-black tracking-tight uppercase leading-none print:text-gray-900">
              {report.project_name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/40 font-bold uppercase tracking-wider print:text-gray-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                Reviewed: {formattedDate}
              </span>
              <span className="hidden sm:inline text-white/10 print:text-gray-300">·</span>
              <span className="flex items-center gap-1.5 truncate max-w-xs md:max-w-md">
                <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                <a 
                  href={report.target_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="hover:text-white transition-colors underline decoration-cyan-500/30 print:no-underline print:text-black"
                >
                  {report.target_url}
                </a>
              </span>
              <span className="hidden sm:inline text-white/10 print:text-gray-300">·</span>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                {report.stats.total_issues} Feedback Pins
              </span>
            </div>
          </div>

          {/* Interactive controls */}
          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={handleCopyLink}
              className={cn(
                "rounded-xl h-11 px-5 text-xs font-bold transition-all flex items-center gap-2 active:scale-95",
                copySuccess 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40" 
                  : "bg-white/5 border border-white/5 hover:bg-white/10 text-white"
              )}
            >
              <Share2 className="w-4 h-4" />
              {copySuccess ? 'Link Copied!' : 'Share Link'}
            </button>
            
            <button
              onClick={handlePrint}
              className="rounded-xl h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs px-5 shadow-lg shadow-purple-950/40 hover:shadow-purple-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* ================= SUMMARY METRICS ROW ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          
          {/* Critical stat card */}
          <div className="p-5 rounded-2xl bg-[#0c0c0e]/80 border border-white/5 bg-gradient-to-br from-rose-500/5 to-transparent flex items-center justify-between shadow-xl print:card">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">Critical</span>
              <p className="text-2xl md:text-3xl font-mono font-black tracking-tight text-white print:text-black">
                {report.stats.critical.toString().padStart(2, '0')}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 print:bg-red-50 print:border-red-100">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          {/* Needs Work card */}
          <div className="p-5 rounded-2xl bg-[#0c0c0e]/80 border border-white/5 bg-gradient-to-br from-orange-500/5 to-transparent flex items-center justify-between shadow-xl print:card">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">Needs Work</span>
              <p className="text-2xl md:text-3xl font-mono font-black tracking-tight text-white print:text-black">
                {report.stats.needs_work.toString().padStart(2, '0')}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 print:bg-amber-50 print:border-amber-100">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>

          {/* Looks Good card */}
          <div className="p-5 rounded-2xl bg-[#0c0c0e]/80 border border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent flex items-center justify-between shadow-xl print:card">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Looks Good</span>
              <p className="text-2xl md:text-3xl font-mono font-black tracking-tight text-white print:text-black">
                {report.stats.approved.toString().padStart(2, '0')}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 print:bg-green-50 print:border-green-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Total Review Time card */}
          <div className="p-5 rounded-2xl bg-[#0c0c0e]/80 border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent flex items-center justify-between shadow-xl print:card">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Review Duration</span>
              <p className="text-2xl md:text-3xl font-mono font-black tracking-tight text-white print:text-black">
                {report.stats.review_time_mins} min
              </p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 print:bg-blue-50 print:border-blue-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* ================= OBSERVATION CARDS GRID ================= */}
        {report.issues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {report.issues.map((issue: any) => (
              <div 
                key={issue.id} 
                className="rounded-3xl border border-white/5 bg-[#0c0c0e]/60 flex flex-col overflow-hidden shadow-lg transition-all duration-300 hover:border-white/10 print:card"
              >
                {/* Image context thumbnail */}
                {issue.screenshot_url ? (
                  <div 
                    onClick={() => setActiveScreenshot(issue.screenshot_url)}
                    className="relative h-44 bg-black/20 overflow-hidden cursor-pointer group flex-shrink-0 border-b border-white/5 print:h-36 print:border-gray-200"
                  >
                    <img
                      src={issue.screenshot_url}
                      alt="Visual discrepancy context"
                      className="w-full h-full object-cover opacity-60 hover:opacity-100 group-hover:scale-105 transition-all duration-500 print:opacity-100"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 print:hidden">
                      <span className="text-[10px] font-black uppercase tracking-widest py-1.5 px-3 rounded-lg bg-black/70 border border-white/15 backdrop-blur-md">Zoom View</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 bg-white/[0.01] border-b border-white/5 flex items-center justify-center text-white/10 uppercase tracking-widest text-[9px] font-bold font-mono print:hidden">
                    No snapshot captured
                  </div>
                )}

                {/* Card Content body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    
                    {/* Badge header */}
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        issue.priority === 'Critical' 
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-500 print:badge-critical" 
                          : issue.priority === 'Needs Work'
                          ? "bg-orange-500/10 border-orange-500/20 text-orange-400 print:badge-work"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 print:badge-good"
                      )}>
                        {issue.priority}
                      </span>
                      
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        issue.status === 'Fixed ✓'
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 print:badge-good"
                          : issue.status === 'Being Fixed'
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 print:badge-work"
                          : "bg-white/5 border-white/10 text-white/40 print:border-gray-200 print:text-gray-500"
                      )}>
                        {issue.status}
                      </span>
                    </div>

                    {/* plain text title & desc */}
                    <h3 className="font-bold text-sm text-white uppercase tracking-tight print:text-black leading-snug">
                      {issue.title}
                    </h3>
                    
                    <p className="text-xs text-white/60 leading-relaxed print:text-gray-700 min-h-[4rem] line-clamp-3">
                      {issue.description || 'No descriptive comments added.'}
                    </p>

                  </div>

                  {/* Device and Page Context footer */}
                  <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 text-[10px] text-white/40 font-bold uppercase tracking-wider print:border-gray-200 print:text-gray-600">
                    <span className="flex items-center gap-1 max-w-[150px] truncate">
                      <LinkIcon className="w-3 h-3 text-cyan-400/80" />
                      {issue.page_url_truncated}
                    </span>
                    
                    <span className="flex items-center gap-1">
                      {issue.device === 'Mobile' ? (
                        <>
                          <Smartphone className="w-3.5 h-3.5 text-purple-400/80" />
                          Mobile
                        </>
                      ) : issue.device === 'Tablet' ? (
                        <>
                          <Tablet className="w-3.5 h-3.5 text-orange-400/80" />
                          Tablet
                        </>
                      ) : (
                        <>
                          <Monitor className="w-3.5 h-3.5 text-cyan-400/80" />
                          Desktop
                        </>
                      )}
                    </span>
                  </div>

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-white/10 bg-[#0c0c0e]/30 rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-4">
            <CheckCircle2 className="w-12 h-12 text-white/20" />
            <h3 className="text-base font-black tracking-tight text-white">No Feedback Pins Logged</h3>
            <p className="text-xs text-white/40 max-w-xs uppercase tracking-wider font-bold">
              This review session contains no feedback pins. All checks passed successfully!
            </p>
          </div>
        )}

        {/* ================= PRINT BRANDING FOOTER ================= */}
        <div className="hidden print:flex flex-col items-center justify-center pt-16 pb-6 text-center space-y-2 border-t border-gray-100">
          <span className="text-xs font-mono font-bold tracking-widest text-black">STAGE</span>
          <span className="text-[9px] font-medium text-gray-400">Automated Visual Feedback & UI Review Engine</span>
        </div>

      </div>

      {/* ================= LIGHTBOX MODAL ================= */}
      {activeScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setActiveScreenshot(null)}
            className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-zoom-out"
          />
          
          {/* Close button */}
          <button 
            onClick={() => setActiveScreenshot(null)}
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Screenshot zoom frame */}
          <div className="relative max-w-5xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/15 shadow-2xl z-10">
            <img
              src={activeScreenshot}
              alt="Visual discrepency detail"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

    </div>
  )
}
