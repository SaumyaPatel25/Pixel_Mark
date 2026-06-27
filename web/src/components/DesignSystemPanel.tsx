'use client'

import { useState } from 'react'
import { Palette, Type, Square, Save, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DesignSystem {
  colors: string[]
  fonts: string[]
  borderRadii: string[]
  spacingUnit: number
}

export function DesignSystemPanel({ projectId, initialConfig, onSave }: { 
  projectId: string, 
  initialConfig?: DesignSystem,
  onSave?: (config: DesignSystem) => void
}) {
  const [db, setDb] = useState<DesignSystem>(initialConfig || {
    colors: ['#000000', '#ffffff'],
    fonts: ['Inter', 'sans-serif'],
    borderRadii: ['0px', '4px', '8px', '12px'],
    spacingUnit: 4
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8765'
    try {
      await fetch(`${BASE}/projects/${projectId}/design-system`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db)
      })
      if (onSave) onSave(db)
    } finally {
      setSaving(false)
    }
  }

  const addItem = (key: keyof DesignSystem, value: string) => {
    setDb(prev => ({ ...prev, [key]: [...(prev[key] as string[]), value] }))
  }

  const removeItem = (key: keyof DesignSystem, index: number) => {
    setDb(prev => ({ ...prev, [key]: (prev[key] as string[]).filter((_, i) => i !== index) }))
  }

  return (
    <div className="p-6 space-y-8 bg-[#0a0a0c] border border-white/5 rounded-[32px] shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-white font-black text-xs tracking-widest uppercase">Design Token Enforcer</h3>
          <p className="text-[9px] text-white/20 uppercase font-black font-mono tracking-widest mt-0.5">Automated Compliance Logic</p>
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-white/20" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Color Palette</span>
            </div>
            <button onClick={() => addItem('colors', '#')} className="p-1 px-2 rounded-md bg-white/5 text-[10px] text-white/40 hover:text-white transition-all">+ ADD</button>
         </div>
         <div className="grid grid-cols-2 gap-2">
            {db.colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 group">
                    <div className="w-6 h-6 rounded-lg border border-white/10 shrink-0" style={{ background: c }} />
                    <input 
                        value={c} 
                        onChange={e => {
                            const next = [...db.colors]; next[i] = e.target.value;
                            setDb({ ...db, colors: next });
                        }}
                        className="bg-transparent text-[10px] font-mono text-white/60 outline-none w-full uppercase" 
                    />
                    <button onClick={() => removeItem('colors', i)} className="opacity-0 group-hover:opacity-100 p-1 text-rose-500/40 hover:text-rose-500 transition-all"><X className="w-3 h-3"/></button>
                </div>
            ))}
         </div>
      </div>

      {/* Fonts */}
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-white/20" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Font Families</span>
            </div>
            <button onClick={() => addItem('fonts', 'New Font')} className="p-1 px-2 rounded-md bg-white/5 text-[10px] text-white/40 hover:text-white transition-all">+ ADD</button>
         </div>
         <div className="space-y-2">
            {db.fonts.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 group">
                    <input 
                        value={f} 
                        onChange={e => {
                            const next = [...db.fonts]; next[i] = e.target.value;
                            setDb({ ...db, fonts: next });
                        }}
                        className="bg-transparent text-[10px] font-medium text-white/60 outline-none w-full" 
                    />
                    <button onClick={() => removeItem('fonts', i)} className="opacity-0 group-hover:opacity-100 p-1 text-rose-500/40 hover:text-rose-500 transition-all"><X className="w-3 h-3"/></button>
                </div>
            ))}
         </div>
      </div>

      {/* Radii */}
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Square className="w-3.5 h-3.5 text-white/20" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Border Radii</span>
            </div>
            <button onClick={() => addItem('borderRadii', '0px')} className="p-1 px-2 rounded-md bg-white/5 text-[10px] text-white/40 hover:text-white transition-all">+ ADD</button>
         </div>
         <div className="flex flex-wrap gap-2">
            {db.borderRadii.map((r, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 px-3 rounded-full bg-white/[0.02] border border-white/5 group">
                    <input 
                        value={r} 
                        onChange={e => {
                            const next = [...db.borderRadii]; next[i] = e.target.value;
                            setDb({ ...db, borderRadii: next });
                        }}
                        className="bg-transparent text-[10px] font-mono text-white/60 outline-none w-12 text-center" 
                    />
                    <button onClick={() => removeItem('borderRadii', i)} className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-500/40 hover:text-rose-500 transition-all"><X className="w-2.5 h-2.5"/></button>
                </div>
            ))}
         </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[10px] font-black tracking-widest uppercase rounded-2xl transition-all shadow-xl shadow-cyan-900/20 flex items-center justify-center gap-2"
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? 'Synchronizing Intelligence...' : 'Authorize Token Strategy'}
      </button>

      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
         <p className="text-[9px] text-white/20 font-medium leading-relaxed">
            <span className="text-cyan-500/50">NOTE:</span> Non-compliant elements will trigger a <span className="text-rose-500/50 underline">⚠ DS Badge</span> in the audit tunnel if computed styles deviate from authorized project tokens.
         </p>
      </div>
    </div>
  )
}
