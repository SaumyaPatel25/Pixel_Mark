import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Send, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'

interface Props {
  sessionId: string
  projectName: string
  onClose: () => void
}

export function ReportEmailModal({ sessionId, projectName, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const addToast = useUIStore(s => s.addToast)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || isSending) return

    setIsSending(true)
    try {
      await api.sessions.sendReportEmail(sessionId, { 
        email: email.trim(), 
        message: message.trim() 
      })
      addToast(`Report successfully emailed to ${email}`, 'success')
      onClose()
    } catch (err: any) {
      addToast(err.message || 'Failed to email report', 'error')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative z-10 space-y-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest text-purple-400">Email Report to Client</h3>
            <p className="text-[10px] text-white/40 mt-1 uppercase font-bold tracking-wider">Project: {projectName}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Client Email Address</label>
            <input
              type="email"
              required
              disabled={isSending}
              placeholder="client@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:border-purple-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-white/30 text-[9px] font-black uppercase tracking-widest block">Personal Message (Optional)</label>
            <textarea
              disabled={isSending}
              rows={4}
              placeholder="Hi Team, here is the visual audit summary report of our latest staging build..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:border-purple-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-2.5 justify-end pt-4">
            <button
              type="button"
              disabled={isSending}
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-xs font-bold transition-all text-white/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !email.trim()}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSending ? 'Sending...' : 'Send Report'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
