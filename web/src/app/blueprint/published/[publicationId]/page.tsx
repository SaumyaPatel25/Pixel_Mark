'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Layers,
  Sparkles,
  Download,
  FileText,
  Globe,
  Calendar,
  User,
  CheckCircle2,
  Code,
  ArrowLeft,
  Share2
} from 'lucide-react'
import { api } from '@/lib/api'
import { StageLoader } from '@/components/ui/StageLoader'

export default function PublishedBlueprintPage() {
  const params = useParams()
  const publicationId = params?.publicationId as string

  const [publication, setPublication] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (!publicationId) return

    const loadPub = async () => {
      try {
        const data = await api.blueprint.getPublication(publicationId)
        setPublication(data)
      } catch (err: any) {
        console.error('Failed to load blueprint publication:', err)
        setError(err?.message || 'Publication not found or unauthorized')
      } finally {
        setIsLoading(false)
      }
    }

    loadPub()
  }, [publicationId])

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#070a12] text-slate-200">
        <StageLoader text="Loading Published Blueprint Handoff..." />
      </div>
    )
  }

  if (error || !publication) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#070a12] text-slate-200 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Publication Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          The requested Blueprint publication could not be loaded. Ensure the URL or publication ID is correct.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }

  const metadata = publication.metadata_json || {}
  const mutations = metadata.mutations || []
  const project = metadata.project || {}

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(publication, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blueprint-publication-v${publication.blueprint_version}.json`
    a.click()
  }

  return (
    <div className="min-h-screen w-full bg-[#070a12] font-sans antialiased text-slate-200 select-none pb-16">
      {/* Top Header */}
      <header className="h-16 bg-[#0d1322] border-b border-cyan-950/60 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md bg-opacity-90">
        <div className="flex items-center gap-3">
          <Link
            href={project?.id ? `/canvas/${project.id}` : '/dashboard'}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to Blueprint Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              PUBLISHED HANDOFF
            </span>
            <h1 className="text-sm font-bold text-white font-mono truncate max-w-xs sm:max-w-md">
              {publication.name}
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
              v{publication.blueprint_version}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-5xl mx-auto px-6 pt-8 space-y-6">
        {/* Publication Metadata Card */}
        <div className="p-6 bg-[#0d1322] border border-cyan-500/20 rounded-2xl shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Project Name</span>
              <span className="text-sm font-bold text-white truncate block">
                {project.name || 'STAGE Project'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Published Date</span>
              <span className="text-sm font-bold text-white truncate block">
                {new Date(publication.created_at).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Author</span>
              <span className="text-sm font-bold text-white truncate block">
                {publication.created_by || 'STAGE Team'}
              </span>
            </div>
          </div>
        </div>

        {/* Changeset Overview Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <span>Published Changeset ({mutations.length} mutations)</span>
            </h2>
          </div>

          <div className="space-y-3">
            {mutations.length === 0 ? (
              <div className="p-8 text-center bg-[#0d1322] border border-slate-800 rounded-2xl text-slate-500 italic">
                No mutations stored in this publication.
              </div>
            ) : (
              mutations.map((mut: any, idx: number) => (
                <div
                  key={mut.id || idx}
                  className="p-5 bg-[#0d1322] border border-slate-800/80 hover:border-cyan-500/30 rounded-2xl shadow-lg transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center border border-cyan-500/20">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-bold text-white">{mut.presetName || 'DOM Mutation'}</h3>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold uppercase">
                        {mut.actionType}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500">ID: {mut.id}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300">
                    <span className="text-slate-500 text-[10px] block mb-1">Target Selector:</span>
                    <span className="text-cyan-300 font-semibold">{mut.targetSelector}</span>
                  </div>

                  {mut.htmlPayload && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto">
                      <span className="text-slate-500 text-[10px] block mb-1">HTML Payload:</span>
                      <pre className="text-slate-300 text-[11px] font-mono whitespace-pre-wrap">
                        {mut.htmlPayload}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
