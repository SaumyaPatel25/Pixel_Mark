import React from 'react'
import { useMarkerStore } from '@/store/markerStore'
import { Sparkles, AlertCircle, Activity, LayoutList, ListOrdered } from 'lucide-react'
import Link from 'next/link'

interface Props {
  sessionId: string
}

export function AISummaryPanel({ sessionId }: Props) {
  const summarizeSession = useMarkerStore(s => s.summarizeSession)
  const sessionSummary = useMarkerStore(s => s.sessionSummary)
  const isSummarizing = useMarkerStore(s => s.isSummarizing)
  const summaryError = useMarkerStore(s => s.summaryError)

  const handleSummarize = () => {
    summarizeSession(sessionId)
  }

  const isNoProviderError = summaryError?.toLowerCase().includes('no active default')

  return (
    <div className="bg-slate-800/30 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
        <h3 className="font-medium text-white flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          AI Session Summary
        </h3>
        <button
          onClick={handleSummarize}
          disabled={isSummarizing}
          className="text-xs font-medium bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          {sessionSummary ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      <div className="p-4 text-sm text-gray-300">
        {isSummarizing && (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700/50 rounded w-full"></div>
            <div className="h-4 bg-slate-700/50 rounded w-5/6"></div>
          </div>
        )}

        {summaryError && !isSummarizing && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-md">
            {isNoProviderError ? (
              <div className="space-y-2">
                <p className="text-red-400 font-medium">Connect your own AI provider to generate session summaries.</p>
                <Link 
                  href="/settings/ai?source=empty_state" 
                  className="inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors"
                >
                  Open AI settings
                </Link>
              </div>
            ) : (
              <p className="text-red-400 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{summaryError}</span>
              </p>
            )}
          </div>
        )}

        {!isSummarizing && !summaryError && !sessionSummary && (
          <div className="text-center py-6 text-gray-500">
            Click generate to get an AI-powered overview of this session.
          </div>
        )}

        {!isSummarizing && sessionSummary && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-2">
                <Activity size={16} /> Health Score
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                ${sessionSummary.overall_health.toLowerCase().includes('good') ? 'bg-green-500/20 text-green-400' :
                  sessionSummary.overall_health.toLowerCase().includes('poor') ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'}`}
              >
                {sessionSummary.overall_health}
              </span>
            </div>

            <p className="leading-relaxed text-gray-300 bg-slate-900/50 p-3 rounded-md border border-slate-800/50">
              {sessionSummary.session_summary}
            </p>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-900/50 rounded p-2 border border-red-500/20">
                <div className="text-red-400 font-bold text-lg">{sessionSummary.counts.critical}</div>
                <div className="text-[10px] uppercase text-gray-500 font-medium tracking-wider">Critical</div>
              </div>
              <div className="bg-slate-900/50 rounded p-2 border border-orange-500/20">
                <div className="text-orange-400 font-bold text-lg">{sessionSummary.counts.high}</div>
                <div className="text-[10px] uppercase text-gray-500 font-medium tracking-wider">High</div>
              </div>
              <div className="bg-slate-900/50 rounded p-2 border border-yellow-500/20">
                <div className="text-yellow-400 font-bold text-lg">{sessionSummary.counts.medium}</div>
                <div className="text-[10px] uppercase text-gray-500 font-medium tracking-wider">Medium</div>
              </div>
              <div className="bg-slate-900/50 rounded p-2 border border-blue-500/20">
                <div className="text-blue-400 font-bold text-lg">{sessionSummary.counts.low}</div>
                <div className="text-[10px] uppercase text-gray-500 font-medium tracking-wider">Low</div>
              </div>
            </div>

            {sessionSummary.top_issues.length > 0 && (
              <div>
                <h4 className="text-gray-400 font-medium flex items-center gap-2 mb-2">
                  <LayoutList size={16} /> Top Issues
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-gray-300 ml-1">
                  {sessionSummary.top_issues.map((issue, i) => (
                    <li key={i} className="text-sm">{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {sessionSummary.suggested_fix_order.length > 0 && (
              <div>
                <h4 className="text-gray-400 font-medium flex items-center gap-2 mb-2">
                  <ListOrdered size={16} /> Suggested Fix Order
                </h4>
                <div className="space-y-2">
                  {sessionSummary.suggested_fix_order.map((step, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="text-gray-300 pt-0.5">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
