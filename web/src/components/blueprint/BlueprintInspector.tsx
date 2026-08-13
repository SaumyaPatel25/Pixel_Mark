'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Sliders,
  Maximize2,
  Layout,
  Type,
  Move,
  Palette,
  Square,
  Sparkles,
  ChevronDown,
  ChevronRight,
  X,
  Image as ImageIcon,
  MousePointerClick,
  Edit3,
  Layers,
  Eye,
  SlidersHorizontal,
  ChevronRight as BreadcrumbChevron,
  Zap,
  Target,
  FileCode
} from 'lucide-react'
import {
  useBlueprintStore,
  BlueprintFrameNode,
  BlueprintElementNode,
  BlueprintDOMTarget
} from '@/store/blueprintStore'

export function BlueprintInspector() {
  const {
    frames,
    selectedFrameId,
    selectedNodeId,
    updateFramePosition,
    updateNodeStyles,
    isInspectorOpen,
    toggleInspector,
    selectedTarget,
    setSelectedTarget,
    pendingMutations,
    removeMutation,
    addMutation,
    toggleLibrary
  } = useBlueprintStore()

  // Elementor-style section collapse state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    layout: true,
    typography: true,
    spacing: true,
    background: false,
    border: false,
    effects: false,
    advanced: false,
    targetActions: true,
    mutations: true,
    frame: true
  })

  // Local style states for optimistic live updating
  const [customText, setCustomText] = useState('')
  const [customFontSize, setCustomFontSize] = useState('')
  const [customColor, setCustomColor] = useState('')
  const [customBgColor, setCustomBgColor] = useState('')
  const [customPadding, setCustomPadding] = useState('')
  const [customMargin, setCustomMargin] = useState('')
  const [customRadius, setCustomRadius] = useState('')
  const [customOpacity, setCustomOpacity] = useState('')

  const currentFrame = frames.find((f) => f.id === selectedFrameId)

  // Find node helper for local mock nodes
  const findNode = (elements: BlueprintElementNode[]): BlueprintElementNode | null => {
    for (const el of elements) {
      if (el.id === selectedNodeId) return el
      if (el.children) {
        const found = findNode(el.children)
        if (found) return found
      }
    }
    return null
  }

  const currentNode = currentFrame && selectedNodeId ? findNode(currentFrame.elements) : null

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Parse selector into ancestry breadcrumbs (e.g. "body > main > section.hero > div > h2")
  const ancestryBreadcrumbs = useMemo(() => {
    if (!selectedTarget?.selector) return []
    const parts = selectedTarget.selector
      .split('>')
      .map((s) => s.trim())
      .filter(Boolean)

    return parts.map((part, index) => {
      const isLast = index === parts.length - 1
      const tagMatch = part.match(/^([a-zA-Z0-9]+)/)
      const tag = tagMatch ? tagMatch[1] : 'div'
      const selectorUntil = parts.slice(0, index + 1).join(' > ')
      return {
        tag,
        raw: part,
        selector: selectorUntil,
        isLast
      }
    })
  }, [selectedTarget?.selector])

  const textDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTextContentUpdate = (newText: string) => {
    setCustomText(newText)
    if (!selectedTarget) return

    if (textDebounceRef.current) {
      clearTimeout(textDebounceRef.current)
    }

    textDebounceRef.current = setTimeout(() => {
      addMutation({
        targetSelector: selectedTarget.selector,
        actionType: 'replace',
        presetId: 'custom_text_edit',
        presetName: `Text Edit (${selectedTarget.tag})`,
        htmlPayload: `<${selectedTarget.tag} style="color:${customColor || 'inherit'}; font-size:${customFontSize || 'inherit'};">${newText}</${selectedTarget.tag}>`
      })
    }, 250)
  }

  const handleStyleMutation = (property: string, value: string) => {
    if (!selectedTarget) return

    const iframeWindow = (document.querySelector('iframe') as HTMLIFrameElement)?.contentWindow
    if (iframeWindow) {
      iframeWindow.postMessage(
        {
          type: 'STAGE_PREVIEW_STYLE_MUTATION',
          selector: selectedTarget.selector,
          property,
          value
        },
        '*'
      )
    }
  }

  // Check if active target has pending mutations
  const targetMutations = useMemo(() => {
    if (!selectedTarget) return []
    return pendingMutations.filter((m) => m.targetSelector === selectedTarget.selector)
  }, [pendingMutations, selectedTarget])

  const hasTypographyChanges = !!customText || !!customFontSize || !!customColor
  const hasBackgroundChanges = !!customBgColor
  const hasSpacingChanges = !!customPadding || !!customMargin
  const hasBorderChanges = !!customRadius
  const hasEffectsChanges = !!customOpacity

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isInspectorOpen) return
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const activeEl = document.activeElement
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.getAttribute('contenteditable') === 'true')
        ) {
          (activeEl as HTMLElement).blur()
          return
        }
        toggleInspector()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)

    // Focus first actionable element inside the inspector container
    setTimeout(() => {
      if (containerRef.current) {
        const focusable = containerRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex="0"]'
        ) as HTMLElement
        if (focusable) focusable.focus()
      }
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      const trigger = document.getElementById('inspector-toggle-btn')
      if (trigger) {
        trigger.focus()
      }
    }
  }, [isInspectorOpen, toggleInspector])

  if (!isInspectorOpen) return null

  return (
    <div 
      ref={containerRef}
      className="w-80 bg-[#0d1322] border-l border-slate-800 flex flex-col text-slate-200 select-none z-10 shrink-0 shadow-2xl transition-all duration-200 ease-in-out"
    >
      <aside className="w-full h-full flex flex-col">
      {/* Inspector Header */}
      <div className="h-11 px-4 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300 bg-[#090d16]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white tracking-wide">Property Inspector</span>
        </div>
        <button
          onClick={toggleInspector}
          className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          title="Close Inspector"
          aria-label="Close property inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto text-xs divide-y divide-slate-800/60">
        {/* ================================================================= */}
        {/* 1. DOM TARGET INSPECTOR (If selectedTarget is active)             */}
        {/* ================================================================= */}
        {selectedTarget ? (
          <div className="transition-all duration-200 ease-in-out">
            {/* Selected Target Banner & DOM Ancestry Breadcrumb */}
            <div className="p-4 bg-[#090d16] border-b border-cyan-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] uppercase font-mono font-extrabold text-cyan-400 tracking-wider">
                    Selected Element
                  </span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase border border-cyan-500/30">
                  {selectedTarget.targetKind}
                </span>
              </div>

              {/* Tag & Selector */}
              <h4 className="text-base font-bold text-white font-mono flex items-center gap-1.5">
                <span className="text-cyan-400">&lt;</span>
                <span>{selectedTarget.tag}</span>
                <span className="text-cyan-400">&gt;</span>
              </h4>

              {/* DOM Ancestry Breadcrumb Bar */}
              {ancestryBreadcrumbs.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-2">
                  {ancestryBreadcrumbs.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <BreadcrumbChevron className="w-3 h-3 text-slate-600 shrink-0" />}
                      <button
                        onClick={() => {
                          setSelectedTarget({
                            ...selectedTarget,
                            selector: item.selector,
                            tag: item.tag
                          })
                        }}
                        className={`px-1.5 py-0.5 rounded truncate max-w-[90px] transition-colors shrink-0 ${
                          item.isLast
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                            : 'hover:bg-slate-800 hover:text-slate-200'
                        }`}
                        title={item.selector}
                      >
                        {item.tag}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions / Preset Library */}
            <InspectorSection
              title="Elementor Quick Actions"
              icon={<Zap className="w-3.5 h-3.5 text-cyan-400" />}
              isOpen={openSections.targetActions}
              onToggle={() => toggleSection('targetActions')}
            >
              <div className="space-y-2">
                <button
                  onClick={toggleLibrary}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Insert Preset Block</span>
                </button>
              </div>
            </InspectorSection>

            {/* 1. Layout Section */}
            <InspectorSection
              title="Layout & Flex"
              icon={<Layout className="w-3.5 h-3.5 text-purple-400" />}
              isOpen={openSections.layout}
              onToggle={() => toggleSection('layout')}
            >
              <div className="space-y-2.5">
                <SelectField
                  label="Display"
                  value="block"
                  options={['block', 'flex', 'grid', 'inline-block', 'none']}
                  onChange={(val) => handleStyleMutation('display', val)}
                />
                <SelectField
                  label="Flex Direction"
                  value="row"
                  options={['row', 'column', 'row-reverse', 'column-reverse']}
                  onChange={(val) => handleStyleMutation('flexDirection', val)}
                />
                <InputField
                  label="Width"
                  value="auto"
                  onChange={(val) => handleStyleMutation('width', val)}
                />
              </div>
            </InspectorSection>

            {/* 2. Typography Section */}
            <InspectorSection
              title="Typography & Content"
              icon={<Type className="w-3.5 h-3.5 text-emerald-400" />}
              isOpen={openSections.typography}
              onToggle={() => toggleSection('typography')}
              hasChanges={hasTypographyChanges}
            >
              <div className="space-y-3">
                {['text', 'button', 'input', 'generic'].includes(selectedTarget.targetKind) && (
                  <div>
                    <label className="text-slate-400 text-[11px] font-mono block mb-1 font-semibold">
                      Text Content
                    </label>
                    <textarea
                      rows={2}
                      defaultValue={selectedTarget.textExcerpt || ''}
                      onChange={(e) => handleTextContentUpdate(e.target.value)}
                      placeholder="Enter new text..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-sans resize-none"
                    />
                  </div>
                )}

                <InputField
                  label="Font Size"
                  value={customFontSize || '16px'}
                  onChange={(v) => {
                    setCustomFontSize(v)
                    handleStyleMutation('fontSize', v)
                  }}
                />

                <InputField
                  label="Color"
                  value={customColor || '#ffffff'}
                  onChange={(v) => {
                    setCustomColor(v)
                    handleStyleMutation('color', v)
                  }}
                />
              </div>
            </InspectorSection>

            {/* 3. Spacing Section */}
            <InspectorSection
              title="Spacing & Margins"
              icon={<Move className="w-3.5 h-3.5 text-amber-400" />}
              isOpen={openSections.spacing}
              onToggle={() => toggleSection('spacing')}
              hasChanges={hasSpacingChanges}
            >
              <div className="space-y-2.5">
                <InputField
                  label="Padding"
                  value={customPadding || '16px'}
                  onChange={(v) => {
                    setCustomPadding(v)
                    handleStyleMutation('padding', v)
                  }}
                />
                <InputField
                  label="Margin"
                  value={customMargin || '0px'}
                  onChange={(v) => {
                    setCustomMargin(v)
                    handleStyleMutation('margin', v)
                  }}
                />
              </div>
            </InspectorSection>

            {/* 4. Background Section */}
            <InspectorSection
              title="Background"
              icon={<Palette className="w-3.5 h-3.5 text-blue-400" />}
              isOpen={openSections.background}
              onToggle={() => toggleSection('background')}
              hasChanges={hasBackgroundChanges}
            >
              <InputField
                label="Fill Color"
                value={customBgColor || '#0f172a'}
                onChange={(v) => {
                  setCustomBgColor(v)
                  handleStyleMutation('backgroundColor', v)
                }}
              />
            </InspectorSection>

            {/* 5. Border Section */}
            <InspectorSection
              title="Border & Radius"
              icon={<Square className="w-3.5 h-3.5 text-rose-400" />}
              isOpen={openSections.border}
              onToggle={() => toggleSection('border')}
              hasChanges={hasBorderChanges}
            >
              <InputField
                label="Border Radius"
                value={customRadius || '8px'}
                onChange={(v) => {
                  setCustomRadius(v)
                  handleStyleMutation('borderRadius', v)
                }}
              />
            </InspectorSection>

            {/* 6. Effects Section */}
            <InspectorSection
              title="Effects & Opacity"
              icon={<Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
              isOpen={openSections.effects}
              onToggle={() => toggleSection('effects')}
              hasChanges={hasEffectsChanges}
            >
              <InputField
                label="Opacity"
                value={customOpacity || '1'}
                onChange={(v) => {
                  setCustomOpacity(v)
                  handleStyleMutation('opacity', v)
                }}
              />
            </InspectorSection>

            {/* Target Mutations List */}
            <div className="p-4 space-y-2 border-t border-slate-800 bg-[#090d16]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Active Element Mutations ({targetMutations.length})
                </span>
              </div>

              {targetMutations.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic block">No active mutations on this element.</span>
              ) : (
                targetMutations.map((mut) => (
                  <div
                    key={mut.id}
                    className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase border border-cyan-500/30">
                          {mut.actionType}
                        </span>
                        <span className="font-bold text-slate-200 truncate">{mut.presetName}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMutation(mut.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Remove Mutation"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : currentFrame ? (
          /* ================================================================= */
          /* 2. FRAME INSPECTOR (If artboard is selected)                     */
          /* ================================================================= */
          <div className="transition-all duration-200 ease-in-out">
            <div className="p-4 bg-[#090d16] border-b border-slate-800">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                {currentNode ? 'Selected Node' : 'Active Artboard'}
              </span>
              <h4 className="text-sm font-bold text-white truncate">
                {currentNode ? currentNode.name : currentFrame.title}
              </h4>
            </div>

            <InspectorSection
              title="Artboard Geometry"
              icon={<Maximize2 className="w-3.5 h-3.5 text-cyan-400" />}
              isOpen={openSections.frame}
              onToggle={() => toggleSection('frame')}
            >
              <div className="grid grid-cols-2 gap-2">
                <InputField
                  label="Position X"
                  value={currentFrame.positionX}
                  onChange={(v) => updateFramePosition(currentFrame.id, Number(v), currentFrame.positionY)}
                />
                <InputField
                  label="Position Y"
                  value={currentFrame.positionY}
                  onChange={(v) => updateFramePosition(currentFrame.id, currentFrame.positionX, Number(v))}
                />
                <InputField label="Width" value={currentFrame.width} disabled />
                <InputField label="Height" value={currentFrame.height} disabled />
              </div>
            </InspectorSection>
          </div>
        ) : (
          /* ================================================================= */
          /* 3. ELEMENTOR EMPTY PLACEHOLDER STATE                              */
          /* ================================================================= */
          <div className="p-8 text-center text-slate-400 space-y-4 my-auto flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
              <Target className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">No Element Selected</h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Click any HTML element on the canvas live surface in <strong className="text-cyan-400">DOM Edit</strong> mode to inspect, edit typography, and customize styles.
              </p>
            </div>
          </div>
        )}
      </div>
      </aside>
    </div>
  )
}

function InspectorSection({
  title,
  icon,
  isOpen,
  onToggle,
  hasChanges = false,
  children
}: {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  hasChanges?: boolean
  children: React.ReactNode
}) {
  const sectionId = `inspector-section-${title.toLowerCase().replace(/\s+/g, '-')}`
  const triggerId = `inspector-section-trigger-${title.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="border-b border-slate-800/60">
      <button
        onClick={onToggle}
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={sectionId}
        className="w-full px-4 py-3 flex items-center justify-between font-semibold text-slate-300 hover:text-white hover:bg-slate-800/40 transition-all cursor-pointer group focus:ring-2 focus:ring-cyan-500 focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-xs tracking-tight">{title}</span>
          {hasChanges && (
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono">
              <Edit3 className="w-2.5 h-2.5" />
              <span>EDITED</span>
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
        )}
      </button>
      {isOpen && (
        <div 
          id={sectionId}
          role="region"
          aria-labelledby={triggerId}
          className="px-4 pb-4 pt-1 space-y-3 transition-all duration-200 ease-in-out"
        >
          {children}
        </div>
      )}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  disabled = false
}: {
  label: string
  value: string | number
  onChange?: (val: string) => void
  disabled?: boolean
}) {
  const [localVal, setLocalVal] = useState(value)

  useEffect(() => {
    setLocalVal(value)
  }, [value])

  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-slate-400 text-[11px] font-mono shrink-0 font-medium">{label}</label>
      <input
        type="text"
        value={localVal}
        disabled={disabled}
        onChange={(e) => {
          setLocalVal(e.target.value)
          if (onChange) onChange(e.target.value)
        }}
        className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 text-right font-mono"
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: string[]
  onChange: (val: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-slate-400 text-[11px] font-mono shrink-0 font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 font-mono"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}
