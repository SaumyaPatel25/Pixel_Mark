'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Plus, FolderPlus, Globe, ArrowRight, Loader2, Layout } from 'lucide-react'
import { ProjectCard } from '@/components/ProjectCard'


interface Project {
  id: string
  name: string
  url?: string
  created_at: string
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Creation State
  const [showCreateRow, setShowCreateRow] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectUrl, setNewProjectUrl] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchProjects = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.projects.list()
      setProjects(res || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim() || isCreating) return

    setIsCreating(true)
    try {
      const res = await api.projects.create({
        name: newProjectName.trim(),
        url: newProjectUrl.trim(),
      })
      setProjects((prev) => [...prev, res])
      setNewProjectName('')
      setNewProjectUrl('')
      setShowCreateRow(false)
    } catch (err: any) {
      alert(err.message || 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white leading-tight">
              Welcome back, <span className="text-purple-400">{user?.name || 'Pro Bro'}</span>
            </h1>
            <p className="text-gray-500 text-sm">Monitor stability and visual comments across your application substrate.</p>
          </div>
          
          {!showCreateRow && (
            <button
              onClick={() => setShowCreateRow(true)}
              className="h-12 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 shadow-xl shadow-purple-900/20 transition-all flex items-center gap-2 active:scale-[0.98] text-sm"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>

        {/* Inline Create Row */}
        {showCreateRow && (
          <form onSubmit={handleCreateProject} className="bg-[#111118] border border-purple-500/20 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black tracking-widest text-purple-400 uppercase">Initialize Project Observation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                autoFocus
                required
                disabled={isCreating}
                type="text"
                placeholder="Project Observation Name (e.g. Acme Web)"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:border-purple-500 outline-none transition-all"
              />
              <input
                disabled={isCreating}
                type="url"
                placeholder="Target URL (e.g. https://acme.com)"
                value={newProjectUrl}
                onChange={(e) => setNewProjectUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:border-purple-500 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={isCreating}
                onClick={() => setShowCreateRow(false)}
                className="px-4 py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !newProjectName.trim()}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-900/20 transition-all"
              >
                {isCreating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        )}

        {/* Project Deck */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Loading Projects...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center text-sm font-mono leading-relaxed">
            {error}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => router.push(`/project/${project.id}`)}
              />
            ))}
          </div>
        ) : (
          <div 
            onClick={() => setShowCreateRow(true)}
            className="border-2 border-dashed border-white/5 rounded-3xl p-16 flex flex-col items-center justify-center gap-6 hover:border-purple-500/30 hover:bg-purple-500/[0.02] cursor-pointer transition-all group"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
              <FolderPlus className="w-8 h-8 text-white/20" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-black text-xl text-white/40 tracking-tight">Zero Observations</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/10">Configure your first visual QA project</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
