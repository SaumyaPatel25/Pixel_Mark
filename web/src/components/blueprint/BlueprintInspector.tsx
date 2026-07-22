'use client'

import React, { useState } from 'react'
import {
  Sliders,
  Maximize2,
  Layout,
  Type,
  Move,
  Palette,
  Square,
  Sparkles,
  MessageSquare,
  Target,
  ChevronDown,
  ChevronRight,
  X,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  Image as ImageIcon,
  MousePointerClick,
  Edit3
} from 'lucide-react'
import {
  useBlueprintStore,
  BlueprintFrameNode,
  BlueprintElementNode,
  BlueprintDOMTarget,
  InsertionMode
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
    pendingMutations,
    removeMutation,
    addMutation,
    toggleLibrary
  } = useBlueprintStore()

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    targetHeader: true,
    targetActions: true,
    targetTypography: true,
    targetImage: true,
    targetInput: true,
    targetLayout: true,
    frame: true,
    layout: true,
    typography: true,
    spacing: true,
    background: true,
    border: false,
    effects: false,
    comments: false,
    domTarget: true
  })

  // Live editable fields state for active DOM target
  const [customText, setCustomText] = useState('')
  const [customFontSize, setCustomFontSize] = useState('')
  const [customColor, setCustomColor] = useState('')

  if (!isInspectorOpen) return null

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

  const handleTextContentUpdate = (newText: string) => {
    setCustomText(newText)
    if (!selectedTarget) return

    addMutation({
      targetSelector: selectedTarget.selector,
      actionType: 'replace',
      presetId: 'custom_text_edit',
      presetName: `Edit Text (${selectedTarget.tag})`,
      htmlPayload: `<${selectedTarget.tag} style="color:${customColor || 'inherit'}; font-size:${customFontSize || 'inherit'};">${newText}</${selectedTarget.tag}>`
    })
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

  return (
    <aside className="w-80 bg-[#0d1322] border-l border-cyan-950/60 flex flex-col text-slate-200 select-none z-10 shrink-0">
      {/* Inspector Header */}
      <div className="h-10 px-4 border-b border-cyan-950/50 flex items-center justify-between text-xs font-semibold text-slate-300 bg-[#090d16]">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Inspector</span>
        </div>
        <button
          onClick={toggleInspector}
          className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
          title="Close Inspector"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 text-xs">
        {/* ================================================================= */}
        {/* 1. PRIORITY A: DOM TARGET INSPECTOR (Rendered if selectedTarget)  */}
        {/* ================================================================= */}
        {selectedTarget ? (
          <>
            {/* Selected Target Header */}
            <div className="p-4 bg-cyan-950/20 border-b border-cyan-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-cyan-400">
                  Active DOM Target
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase border border-cyan-500/30">
                  {selectedTarget.targetKind}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white font-mono truncate">
                &lt;{selectedTarget.tag}&gt;
              </h4>
              <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                {selectedTarget.selector}
              </p>
            </div>

            {/* Target Actions & Pick & Place */}
            <InspectorSection
              title="Pick & Place Placement"
              icon={<MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />}
              isOpen={openSections.targetActions}
              onToggle={() => toggleSection('targetActions')}
            >
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={toggleLibrary}
                    className="col-span-2 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open Preset Library</span>
                  </button>
                </div>
              </div>
            </InspectorSection>

            {/* Text / Content Section (if text, button, input, generic) */}
            {['text', 'button', 'input', 'generic'].includes(selectedTarget.targetKind) && (
              <InspectorSection
                title="Content & Typography"
                icon={<Type className="w-3.5 h-3.5 text-emerald-400" />}
                isOpen={openSections.targetTypography}
                onToggle={() => toggleSection('targetTypography')}
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 text-[11px] font-mono block mb-1">
                      Text Content
                    </label>
                    <textarea
                      rows={2}
                      defaultValue={selectedTarget.textExcerpt || ''}
                      onChange={(e) => handleTextContentUpdate(e.target.value)}
                      placeholder="Type custom element text..."
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-sans resize-none"
                    />
                  </div>

                  <InputField
                    label="Font Size"
                    value={customFontSize || '16px'}
                    onChange={(v) => {
                      setCustomFontSize(v)
                      handleStyleMutation('fontSize', v)
                    }}
                  />

                  <InputField
                    label="Text Color"
                    value={customColor || '#ffffff'}
                    onChange={(v) => {
                      setCustomColor(v)
                      handleStyleMutation('color', v)
                    }}
                  />
                </div>
              </InspectorSection>
            )}

            {/* Image Section (if image) */}
            {selectedTarget.targetKind === 'image' && (
              <InspectorSection
                title="Image Properties"
                icon={<ImageIcon className="w-3.5 h-3.5 text-rose-400" />}
                isOpen={openSections.targetImage}
                onToggle={() => toggleSection('targetImage')}
              >
                <div className="space-y-2.5">
                  <InputField
                    label="Source URL"
                    value="https://via.placeholder.com/400"
                    onChange={(v) => handleStyleMutation('backgroundImage', `url(${v})`)}
                  />
                  <InputField label="Width" value="100%" />
                  <InputField label="Border Radius" value="8px" onChange={(v) => handleStyleMutation('borderRadius', v)} />
                </div>
              </InspectorSection>
            )}

            {/* Container / Layout Section (if container or generic) */}
            {['container', 'generic'].includes(selectedTarget.targetKind) && (
              <InspectorSection
                title="Container Layout & Styling"
                icon={<Layout className="w-3.5 h-3.5 text-purple-400" />}
                isOpen={openSections.targetLayout}
                onToggle={() => toggleSection('targetLayout')}
              >
                <div className="space-y-2.5">
                  <InputField
                    label="Background"
                    value="#0f172a"
                    onChange={(v) => handleStyleMutation('backgroundColor', v)}
                  />
                  <InputField
                    label="Padding"
                    value="24px"
                    onChange={(v) => handleStyleMutation('padding', v)}
                  />
                  <InputField
                    label="Radius"
                    value="12px"
                    onChange={(v) => handleStyleMutation('borderRadius', v)}
                  />
                </div>
              </InspectorSection>
            )}

            {/* Applied Mutations List */}
            <div className="p-4 space-y-2 border-t border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Target Mutations ({pendingMutations.length})
              </span>

              {pendingMutations.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic block">No mutations applied to target.</span>
              ) : (
                pendingMutations.map((mut) => (
                  <div
                    key={mut.id}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
                          {mut.actionType}
                        </span>
                        <span className="font-bold text-slate-200 truncate">{mut.presetName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 truncate block mt-0.5">
                        {mut.targetSelector}
                      </span>
                    </div>
                    <button
                      onClick={() => removeMutation(mut.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                      title="Remove Mutation"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : currentFrame ? (
          /* ================================================================= */
          /* 2. PRIORITY B: FRAME & MOCK NODE INSPECTOR (If frame is selected) */
          /* ================================================================= */
          <>
            {/* Target Header Info */}
            <div className="p-4 bg-slate-900/50">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1">
                {currentNode ? 'Selected Element' : 'Selected Frame'}
              </span>
              <h4 className="text-sm font-bold text-white truncate">
                {currentNode ? currentNode.name : currentFrame.title}
              </h4>
            </div>

            {/* 1. Frame / Workspace Panel */}
            <InspectorSection
              title="Frame Geometry"
              icon={<Maximize2 className="w-3.5 h-3.5 text-cyan-400" />}
              isOpen={openSections.frame}
              onToggle={() => toggleSection('frame')}
            >
              <div className="grid grid-cols-2 gap-2">
                <InputField
                  label="X"
                  value={currentFrame.positionX}
                  onChange={(v) => updateFramePosition(currentFrame.id, Number(v), currentFrame.positionY)}
                />
                <InputField
                  label="Y"
                  value={currentFrame.positionY}
                  onChange={(v) => updateFramePosition(currentFrame.id, currentFrame.positionX, Number(v))}
                />
                <InputField label="Width" value={currentFrame.width} disabled />
                <InputField label="Height" value={currentFrame.height} disabled />
              </div>
            </InspectorSection>

            {/* 2. Layout Panel */}
            <InspectorSection
              title="Layout & Flex"
              icon={<Layout className="w-3.5 h-3.5 text-purple-400" />}
              isOpen={openSections.layout}
              onToggle={() => toggleSection('layout')}
            >
              <div className="space-y-2">
                <SelectField
                  label="Display"
                  value={currentNode?.styles.display || 'block'}
                  options={['block', 'flex', 'grid', 'inline-block', 'none']}
                  onChange={(val) =>
                    currentFrame && currentNode && updateNodeStyles(currentFrame.id, currentNode.id, { display: val })
                  }
                />
                <SelectField
                  label="Direction"
                  value={currentNode?.styles.flexDirection || 'row'}
                  options={['row', 'column', 'row-reverse', 'column-reverse']}
                  onChange={(val) =>
                    currentFrame && currentNode && updateNodeStyles(currentFrame.id, currentNode.id, { flexDirection: val })
                  }
                />
              </div>
            </InspectorSection>

            {/* 3. Typography Panel */}
            <InspectorSection
              title="Typography"
              icon={<Type className="w-3.5 h-3.5 text-emerald-400" />}
              isOpen={openSections.typography}
              onToggle={() => toggleSection('typography')}
            >
              <div className="space-y-2">
                <InputField
                  label="Font Size"
                  value={currentNode?.styles.fontSize || '16px'}
                  onChange={(v) =>
                    currentFrame && currentNode && updateNodeStyles(currentFrame.id, currentNode.id, { fontSize: v })
                  }
                />
                <InputField
                  label="Color"
                  value={currentNode?.styles.color || '#ffffff'}
                  onChange={(v) =>
                    currentFrame && currentNode && updateNodeStyles(currentFrame.id, currentNode.id, { color: v })
                  }
                />
              </div>
            </InspectorSection>

            {/* 4. Spacing Panel */}
            <InspectorSection
              title="Spacing & Margins"
              icon={<Move className="w-3.5 h-3.5 text-amber-400" />}
              isOpen={openSections.spacing}
              onToggle={() => toggleSection('spacing')}
            >
              <div className="grid grid-cols-2 gap-2">
                <InputField
                  label="Padding"
                  value={currentNode?.styles.padding || '16px'}
                  onChange={(v) =>
                    currentFrame && currentNode && updateNodeStyles(currentFrame.id, currentNode.id, { padding: v })
                  }
                />
                <InputField
                  label="Gap"
                  value={currentNode?.styles.gap || '12px'}
                  onChange={(v) =>
                    currentFrame && currentNode && updateNodeStyles(currentFrame.id, currentNode.id, { gap: v })
                  }
                />
              </div>
            </InspectorSection>

            {/* 5. Background Panel */}
            <InspectorSection
              title="Background"
              icon={<Palette className="w-3.5 h-3.5 text-blue-400" />}
              isOpen={openSections.background}
              onToggle={() => toggleSection('background')}
            >
              <InputField
                label="Fill Color"
                value={currentNode?.styles.backgroundColor || '#0f172a'}
                onChange={(v) =>
                  currentFrame && currentNode && updateNodeStyles(currentFrame.id, currentNode.id, { backgroundColor: v })
                }
              />
            </InspectorSection>

            {/* 6. Border Panel */}
            <InspectorSection
              title="Border & Radius"
              icon={<Square className="w-3.5 h-3.5 text-rose-400" />}
              isOpen={openSections.border}
              onToggle={() => toggleSection('border')}
            >
              <InputField
                label="Radius"
                value={currentNode?.styles.borderRadius || '8px'}
                onChange={(v) =>
                  currentFrame && currentNode && updateNodeStyles(currentFrame.id, currentNode.id, { borderRadius: v })
                }
              />
            </InspectorSection>
          </>
        ) : (
          /* ================================================================= */
          /* 3. PRIORITY C: EMPTY STATE (If neither target nor frame selected)  */
          /* ================================================================= */
          <div className="p-8 text-center text-slate-500 italic space-y-2">
            <Target className="w-8 h-8 text-slate-600 mx-auto" />
            <p>Select a frame or click an element in DOM Edit mode to inspect properties.</p>
          </div>
        )}
      </div>
    </aside>
  )
}

function InspectorSection({
  title,
  icon,
  isOpen,
  onToggle,
  children
}: {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-slate-800/60">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between font-medium text-slate-300 hover:text-white hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
      </button>
      {isOpen && <div className="px-4 pb-3 pt-1 space-y-3">{children}</div>}
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
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-slate-400 text-[11px] font-mono shrink-0">{label}</label>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50 text-right font-mono"
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
      <label className="text-slate-400 text-[11px] font-mono shrink-0">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
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
