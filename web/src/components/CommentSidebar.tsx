'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Project, Comment } from '../lib/api-contracts'
import { MessageSquare, Clock, Copy, Check, User, Send, MousePointer2, Sparkles, X, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'

interface CommentSidebarProps {
  project: Project
  comments: Comment[]
  activeCommentId?: string | null
  onSelectComment?: (id: string | null) => void
  isTester?: boolean
  onAddComment: (text: string, authorName?: string) => void
  pendingComment?: { x: number, y: number, selector?: string, elementLabel?: string }
  onCancelPending: () => void
}

export default function CommentSidebar({
  project,
  comments,
  activeCommentId,
  onSelectComment,
  isTester = false,
  onAddComment,
  pendingComment,
  onCancelPending,
}: CommentSidebarProps) {
  const [copied, setCopied] = useState(false)
  const [testerName, setTesterName] = useState('')
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    const savedName = localStorage.getItem('pixelmark_tester_name')
    if (savedName) setTesterName(savedName)
  }, [])

  const generateMarkdown = () => {
    let md = `# Feedback for ${project.name}\n`
    md += `**URL**: ${project.target_url}\n\n`
    
    comments.forEach((c, i) => {
      md += `### Issue #${i + 1}: ${c.text.split('\n')[0]}\n`
      md += `- **Author**: ${c.author_name || 'N/A'}\n`
      md += `- **Component**: \`${c.component_ref?.selector || 'N/A'}\`\n`
      md += `- **Position**: X: ${c.component_ref?.x.toFixed(1)}%, Y: ${c.component_ref?.y.toFixed(1)}%\n`
      md += `- **Timestamp**: ${new Date(c.created_at).toLocaleString()}\n`
      md += `\n> ${c.text}\n\n---\n\n`
    })
    return md
  }

  const handlePostComment = () => {
    if (!commentText.trim()) return
    
    if (isTester && testerName.trim()) {
      localStorage.setItem('pixelmark_tester_name', testerName)
    }
    onAddComment(commentText, testerName)
    setCommentText('')
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMarkdown())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-96 h-full flex flex-col bg-black/40 backdrop-blur-3xl border-l border-white/5 relative z-30 nexus-shadow">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="font-black text-sm uppercase tracking-[0.2em] text-white/90">Feedback Feed</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-9 w-9 p-0 hover:bg-white/10 rounded-full"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white/40" />}
        </Button>
      </div>

      {/* Feed Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <AnimatePresence initial={false} mode="popLayout">
          {comments.map((comment, idx) => (
            <motion.div
              layout
              key={comment.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={() => onSelectComment?.(comment.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
                activeCommentId === comment.id 
                  ? 'bg-purple-600/10 border-purple-500/30 ring-1 ring-purple-500/10' 
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10 shadow-lg shadow-black/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 flex items-center justify-center border border-white/5">
                      <span className="text-[10px] font-black text-purple-400">{idx + 1}</span>
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                      {comment.author_name || 'User'}
                   </span>
                </div>
                <span className="text-[9px] text-white/20 font-bold flex items-center gap-1">
                   <Clock className="w-3 h-3" />
                   {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <p className="text-xs text-white/80 leading-relaxed font-medium bg-black/40 p-3 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                {comment.text}
              </p>

              {comment.component_ref?.selector && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                   <MousePointer2 className="w-3 h-3 text-purple-400" />
                   <span className="text-[9px] text-white/20 font-mono truncate">
                      {comment.component_ref.selector}
                   </span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {comments.length === 0 && !pendingComment && (
          <div className="h-40 flex flex-col items-center justify-center text-center px-8 opacity-20">
             <MessageSquare className="w-8 h-8 mb-3" />
             <p className="text-xs font-bold uppercase tracking-widest">Zero Threads</p>
             <p className="text-[10px] mt-1 font-medium">Click on the viewport to start reporting</p>
          </div>
        )}
      </div>

      {/* Composition Area */}
      <AnimatePresence>
        {pendingComment && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="p-6 bg-purple-600/10 border-t border-purple-500/20 backdrop-blur-3xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Capturing Context</span>
              </div>
              <button 
                onClick={onCancelPending}
                className="p-1 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {isTester && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">Reporter Name</label>
                  <input
                    type="text"
                    value={testerName}
                    onChange={(e) => setTesterName(e.target.value)}
                    placeholder="Identify yourself..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-bold"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">Describe Improvement</label>
                <div className="relative">
                  <textarea
                    autoFocus
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="What should be changed here?"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all min-h-[120px] resize-none font-medium leading-relaxed"
                  />
                  <div className="absolute bottom-3 right-3">
                    <Button 
                      onClick={handlePostComment}
                      disabled={!commentText.trim() || (isTester && !testerName.trim())}
                      className="rounded-full w-10 h-10 p-0 shadow-2xl bg-purple-600 hover:bg-purple-500"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center shrink-0">
                    <span className="text-[8px] font-black text-purple-400">{comments.length + 1}</span>
                  </div>
                  <span className="text-[9px] text-white/20 font-mono truncate">{pendingComment.elementLabel || 'Element Region'}</span>
                </div>
                <ChevronRight className="w-3 h-3 text-white/10" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Markdown Preview Area */}
      <div className="p-6 bg-black/60 border-t border-white/5">
        <div className="flex items-center justify-between mb-3">
           <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Production Export</span>
           <span className="text-[9px] font-bold text-purple-400/40">Markdown V1.0</span>
        </div>
        <div className="bg-black/60 rounded-xl p-4 text-[11px] font-mono whitespace-pre-wrap h-32 overflow-y-auto border border-white/5 text-purple-300/60 leading-relaxed shadow-inner custom-scrollbar">
          {generateMarkdown()}
        </div>
      </div>
    </div>
  )
}
