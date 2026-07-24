'use client'

import React, { useEffect, useState } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Settings,
  Mail,
  Layers,
  Video,
  Sparkles,
  X,
  AlertTriangle,
  Send,
  Eye,
  Sliders
} from 'lucide-react'
import { useNotificationStore, NotificationTab } from '@/store/useNotificationStore'
import { NotificationHealthWidget } from './NotificationHealthWidget'
import { NotificationDeliveryMonitorModal } from './NotificationDeliveryMonitorModal'

interface NotificationBellProps {
  projectId?: string
}

export function NotificationBell({ projectId }: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    preferences,
    digestPreview,
    templatePreview,
    isLoading,
    isDrawerOpen,
    activeTab,
    toggleDrawer,
    setActiveTab,
    fetchNotifications,
    markRead,
    markAllRead,
    fetchPreferences,
    savePreferences,
    loadDigestPreview,
    loadTemplatePreview,
    sendTestNotification
  } = useNotificationStore()

  const [showSettings, setShowSettings] = useState(false)
  const [showDigestModal, setShowDigestModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showMonitorModal, setShowMonitorModal] = useState(false)
  const [selectedTone, setSelectedTone] = useState('client_friendly')

  useEffect(() => {
    fetchNotifications(projectId)
    fetchPreferences(projectId)
  }, [projectId, fetchNotifications, fetchPreferences])

  const filtered = notifications.filter(n => {
    if (activeTab === 'blueprint') return n.source_type === 'blueprint'
    if (activeTab === 'session') return n.source_type === 'session'
    if (activeTab === 'unread') return !n.read_at
    return true
  })

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => toggleDrawer()}
        className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
        title="STAGE Notifications"
      >
        <Bell className="w-4 h-4 text-cyan-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold font-mono animate-pulse shadow-md shadow-rose-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-150 select-none">
          <div className="w-full max-w-md bg-[#090d16] border-l border-slate-800 flex flex-col h-full shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">STAGE Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    showSettings
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="Notification Preferences"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => markAllRead(projectId)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                </button>

                <button
                  onClick={() => toggleDrawer(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-1 overflow-x-auto">
              {(['all', 'blueprint', 'session', 'unread'] as NotificationTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                    activeTab === t
                      ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {showSettings ? (
                /* Preferences Panel */
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    <span>Notification Settings</span>
                  </h4>

                  <NotificationHealthWidget onOpenMonitor={() => setShowMonitorModal(true)} />

                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                      <span>Email Delivery</span>
                      <input
                        type="checkbox"
                        checked={preferences?.email_enabled ?? true}
                        onChange={(e) => savePreferences({ email_enabled: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-purple-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                      <span>Daily Project Digest Email</span>
                      <input
                        type="checkbox"
                        checked={preferences?.digest_enabled ?? true}
                        onChange={(e) => savePreferences({ digest_enabled: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-purple-500 cursor-pointer"
                      />
                    </label>

                    <hr className="border-slate-800" />

                    <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                      <span>Blueprint Canvas Events</span>
                      <input
                        type="checkbox"
                        checked={preferences?.allow_blueprint_events ?? true}
                        onChange={(e) => savePreferences({ allow_blueprint_events: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                      <span>Session Review Events</span>
                      <input
                        type="checkbox"
                        checked={preferences?.allow_session_events ?? true}
                        onChange={(e) => savePreferences({ allow_session_events: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        loadDigestPreview(projectId)
                        setShowDigestModal(true)
                      }}
                      className="w-full py-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Digest Email</span>
                    </button>

                    <button
                      onClick={() => {
                        loadTemplatePreview('blueprint', 'comment_created', selectedTone)
                        setShowTemplateModal(true)
                      }}
                      className="w-full py-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Preview Notification Copy Templates</span>
                    </button>

                    <button
                      onClick={() => sendTestNotification(projectId)}
                      className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Test Notification</span>
                    </button>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-bold text-slate-400">No notifications found</p>
                  <p>Events from Blueprint Canvas and Session Review will appear here.</p>
                </div>
              ) : (
                filtered.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      !n.read_at
                        ? 'bg-slate-900/90 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {n.source_type === 'blueprint' ? (
                          <Layers className="w-3.5 h-3.5 text-purple-400" />
                        ) : (
                          <Video className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span className="text-[10px] font-bold font-mono uppercase text-slate-400">
                          {n.source_type}
                        </span>
                        {n.category === 'critical' && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold uppercase">
                            Critical
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-500">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white mt-1.5">{n.title}</h4>
                    <p className="text-xs text-slate-300/90 mt-0.5 line-clamp-2">{n.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Digest Email Preview Modal */}
      {showDigestModal && digestPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" />
                <span>STAGE Digest Email Preview</span>
              </h3>
              <button
                onClick={() => setShowDigestModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs text-slate-300">
              <strong>Subject:</strong> {digestPreview.subject}
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-950/40">
              <div
                className="prose prose-invert max-w-none text-xs"
                dangerouslySetInnerHTML={{ __html: digestPreview.digest_html }}
              />
            </div>

            <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={() => setShowDigestModal(false)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Copy Preview Modal */}
      {showTemplateModal && templatePreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>STAGE Notification Copy Template</span>
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tone Selector */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Tone Variant:</span>
              <div className="flex items-center gap-1.5">
                {['client_friendly', 'concise', 'developer'].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => {
                      setSelectedTone(tone)
                      loadTemplatePreview(templatePreview.source_type, templatePreview.event_type, tone)
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                      selectedTone === tone
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {tone.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Card Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Subject Line</span>
                <p className="text-xs font-extrabold text-white">{templatePreview.subject}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inbox Snippet Preview</span>
                <p className="text-xs text-slate-300 italic">{templatePreview.preview_text}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Email Body Copy</span>
                <p className="text-xs text-slate-200 leading-relaxed">{templatePreview.body}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-850 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Why You Received This</span>
                <p className="text-[11px] text-slate-400">{templatePreview.why_you_got_this}</p>
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Inspector Modal */}
      {showMonitorModal && (
        <NotificationDeliveryMonitorModal onClose={() => setShowMonitorModal(false)} />
      )}
    </div>
  )
}
