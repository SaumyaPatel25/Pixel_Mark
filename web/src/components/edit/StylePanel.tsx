'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  X, RotateCcw, ChevronDown, ChevronRight, Type, Palette, Box,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link2, Unlink,
  Undo2, Redo2, Square, Eye, EyeOff, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectedElementInfo {
  tag: string
  selector: string
}

export interface StylePanelProps {
  selectedElement: SelectedElementInfo | null
  onClose?: () => void
  onFontSizeChange?: (selector: string, fontSizePx: number) => void
  onPropertyChange?: (selector: string, property: string, value: string) => void
  onUndo?: () => void
  onRedo?: () => void
  onResetSection?: (selector: string, sectionProperties: string[]) => void
  onResetAll?: (selector: string) => void
  canUndo?: boolean
  canRedo?: boolean
}

export interface StyleState {
  // Typography
  fontFamily: string
  fontSize: number
  fontWeight: string
  lineHeight: number
  letterSpacing: number
  textAlign: 'left' | 'center' | 'right' | 'justify'
  color: string

  // Background
  backgroundColor: string

  // Spacing - Padding
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  paddingLinked: boolean

  // Spacing - Margin
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  marginLinked: boolean

  // Step 7: Border
  borderWidth: number
  borderStyle: string
  borderColor: string

  // Step 7: Border Radius
  borderTopLeftRadius: number
  borderTopRightRadius: number
  borderBottomRightRadius: number
  borderBottomLeftRadius: number
  borderRadiusLinked: boolean

  // Step 7: Visibility & Opacity
  displayHidden: boolean
  opacity: number

  // Step 7: Box Shadow
  shadowX: number
  shadowY: number
  shadowBlur: number
  shadowSpread: number
  shadowColor: string
}

export const DEFAULT_STYLE_STATE: StyleState = {
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: '400',
  lineHeight: 1.5,
  letterSpacing: 0,
  textAlign: 'left',
  color: '#ffffff',
  backgroundColor: '#0f172a',
  paddingTop: 8,
  paddingRight: 12,
  paddingBottom: 8,
  paddingLeft: 12,
  paddingLinked: false,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginLinked: false,
  borderWidth: 0,
  borderStyle: 'none',
  borderColor: '#3b82f6',
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  borderBottomRightRadius: 0,
  borderBottomLeftRadius: 0,
  borderRadiusLinked: false,
  displayHidden: false,
  opacity: 1,
  shadowX: 0,
  shadowY: 4,
  shadowBlur: 12,
  shadowSpread: 0,
  shadowColor: '#000000'
}

// ─── Debounced Slider Component (Performance Requirement) ────────────────────
const DebouncedSlider = React.memo(({
  value,
  min,
  max,
  step = 1,
  unit = 'px',
  onChange
}: {
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (val: number) => void
}) => {
  const [localVal, setLocalVal] = useState(value)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setLocalVal(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseFloat(e.target.value) || 0
    setLocalVal(num)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange(num)
    }, 150)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localVal}
        onChange={handleChange}
        className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
      />
      <span className="text-[11px] font-mono text-slate-300 w-12 text-right select-none">
        {localVal}{unit}
      </span>
    </div>
  )
})
DebouncedSlider.displayName = 'DebouncedSlider'

// ─── Debounced Color Picker Component ──────────────────────────────────────
const DebouncedColorPicker = React.memo(({
  value,
  onChange
}: {
  value: string
  onChange: (val: string) => void
}) => {
  const [localColor, setLocalColor] = useState(value)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setLocalColor(value)
  }, [value])

  const handleChange = (val: string) => {
    setLocalColor(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange(val)
    }, 150)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex items-center justify-center w-7 h-7 rounded-lg border border-slate-700 overflow-hidden shadow-inner cursor-pointer" style={{ backgroundColor: localColor }}>
        <input
          type="color"
          value={localColor}
          onChange={(e) => handleChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </div>
      <input
        type="text"
        value={localColor}
        onChange={(e) => handleChange(e.target.value)}
        className="flex-1 h-7 px-2.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-purple-500"
      />
    </div>
  )
})
DebouncedColorPicker.displayName = 'DebouncedColorPicker'

// ─── StylePanel Component (Memoized) ───────────────────────────────────────
export const StylePanel = React.memo(({
  selectedElement,
  onClose,
  onFontSizeChange,
  onPropertyChange,
  onUndo,
  onRedo,
  onResetSection,
  onResetAll,
  canUndo = false,
  canRedo = false
}: StylePanelProps) => {
  const [styles, setStyles] = useState<StyleState>(DEFAULT_STYLE_STATE)

  // Collapsible section states
  const [typographyOpen, setTypographyOpen] = useState(true)
  const [backgroundOpen, setBackgroundOpen] = useState(true)
  const [spacingOpen, setSpacingOpen] = useState(true)

  if (!selectedElement) return null

  // Reset all handler
  const handleResetAll = useCallback(() => {
    setStyles(DEFAULT_STYLE_STATE)
    if (selectedElement?.selector) {
      onResetAll?.(selectedElement.selector)
    }
  }, [selectedElement?.selector, onResetAll])

  // Reset section handlers
  const handleResetTypography = useCallback(() => {
    setStyles(prev => ({
      ...prev,
      fontFamily: DEFAULT_STYLE_STATE.fontFamily,
      fontSize: DEFAULT_STYLE_STATE.fontSize,
      fontWeight: DEFAULT_STYLE_STATE.fontWeight,
      lineHeight: DEFAULT_STYLE_STATE.lineHeight,
      letterSpacing: DEFAULT_STYLE_STATE.letterSpacing,
      textAlign: DEFAULT_STYLE_STATE.textAlign,
      color: DEFAULT_STYLE_STATE.color
    }))
    if (selectedElement?.selector) {
      onResetSection?.(selectedElement.selector, ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'color'])
    }
  }, [selectedElement?.selector, onResetSection])

  const handleResetBackground = useCallback(() => {
    setStyles(prev => ({
      ...prev,
      backgroundColor: DEFAULT_STYLE_STATE.backgroundColor
    }))
    if (selectedElement?.selector) {
      onResetSection?.(selectedElement.selector, ['backgroundColor'])
    }
  }, [selectedElement?.selector, onResetSection])

  const handleResetSpacing = useCallback(() => {
    setStyles(prev => ({
      ...prev,
      paddingTop: DEFAULT_STYLE_STATE.paddingTop,
      paddingRight: DEFAULT_STYLE_STATE.paddingRight,
      paddingBottom: DEFAULT_STYLE_STATE.paddingBottom,
      paddingLeft: DEFAULT_STYLE_STATE.paddingLeft,
      paddingLinked: DEFAULT_STYLE_STATE.paddingLinked,
      marginTop: DEFAULT_STYLE_STATE.marginTop,
      marginRight: DEFAULT_STYLE_STATE.marginRight,
      marginBottom: DEFAULT_STYLE_STATE.marginBottom,
      marginLeft: DEFAULT_STYLE_STATE.marginLeft,
      marginLinked: DEFAULT_STYLE_STATE.marginLinked
    }))
    if (selectedElement?.selector) {
      onResetSection?.(selectedElement.selector, ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'])
    }
  }, [selectedElement?.selector, onResetSection])

  // 4-side spacing change helper (Elementor style linked/unlinked)
  const handlePaddingChange = (side: 'top' | 'right' | 'bottom' | 'left', val: number) => {
    setStyles(prev => {
      if (prev.paddingLinked) {
        return { ...prev, paddingTop: val, paddingRight: val, paddingBottom: val, paddingLeft: val }
      }
      if (side === 'top') return { ...prev, paddingTop: val }
      if (side === 'right') return { ...prev, paddingRight: val }
      if (side === 'bottom') return { ...prev, paddingBottom: val }
      return { ...prev, paddingLeft: val }
    })

    if (selectedElement?.selector) {
      if (styles.paddingLinked) {
        const value = `${val}px`
        console.log("[StylePanel] mutate", { control: "padding", property: "padding", value })
        onPropertyChange?.(selectedElement.selector, 'padding', value)
      } else {
        const propMap = { top: 'paddingTop', right: 'paddingRight', bottom: 'paddingBottom', left: 'paddingLeft' } as const
        const prop = propMap[side]
        const value = `${val}px`
        console.log("[StylePanel] mutate", { control: prop, property: prop, value })
        onPropertyChange?.(selectedElement.selector, prop, value)
      }
    }
  }

  const handleMarginChange = (side: 'top' | 'right' | 'bottom' | 'left', val: number) => {
    setStyles(prev => {
      if (prev.marginLinked) {
        return { ...prev, marginTop: val, marginRight: val, marginBottom: val, marginLeft: val }
      }
      if (side === 'top') return { ...prev, marginTop: val }
      if (side === 'right') return { ...prev, marginRight: val }
      if (side === 'bottom') return { ...prev, marginBottom: val }
      return { ...prev, marginLeft: val }
    })

    if (selectedElement?.selector) {
      if (styles.marginLinked) {
        const value = `${val}px`
        console.log("[StylePanel] mutate", { control: "margin", property: "margin", value })
        onPropertyChange?.(selectedElement.selector, 'margin', value)
      } else {
        const propMap = { top: 'marginTop', right: 'marginRight', bottom: 'marginBottom', left: 'marginLeft' } as const
        const prop = propMap[side]
        const value = `${val}px`
        console.log("[StylePanel] mutate", { control: prop, property: prop, value })
        onPropertyChange?.(selectedElement.selector, prop, value)
      }
    }
  }

  return (
    <div className="fixed top-20 right-4 z-40 w-72 md:w-80 max-h-[calc(100vh-6rem)] flex flex-col bg-slate-900/95 border border-purple-500/20 rounded-2xl shadow-2xl backdrop-blur-xl text-slate-100 overflow-hidden font-sans select-none">
      
      {/* ── PANEL HEADER ────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <div className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-bold uppercase tracking-wider flex-shrink-0">
            &lt;{selectedElement.tag}&gt;
          </div>
          <span className="text-xs font-mono text-slate-400 truncate" title={selectedElement.selector}>
            {selectedElement.selector}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                canUndo ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-600 cursor-not-allowed"
              )}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                canRedo ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-600 cursor-not-allowed"
              )}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleResetAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset All Sections"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── PANEL BODY (SCROLLABLE) ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-2">

        {/* ── SECTION 1: TYPOGRAPHY ─────────────────────────────────────── */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800/50 overflow-hidden">
          {/* Header */}
          <div
            onClick={() => setTypographyOpen(!typographyOpen)}
            className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              {typographyOpen ? <ChevronDown className="w-3.5 h-3.5 text-purple-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              <Type className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Typography</span>
            </div>

            {/* Inline summary when collapsed */}
            <div className="flex items-center gap-2">
              {!typographyOpen && (
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[110px]">
                  {styles.fontFamily} • {styles.fontSize}px • {styles.color}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleResetTypography()
                }}
                className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Reset Typography"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Controls */}
          {typographyOpen && (
            <div className="p-3 space-y-3 bg-slate-900/40 border-t border-slate-800/40 text-xs">
              {/* Font Family */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Font Family</label>
                <select
                  value={styles.fontFamily}
                  onChange={(e) => {
                    const val = e.target.value
                    setStyles(prev => ({ ...prev, fontFamily: val }))
                    if (selectedElement?.selector) {
                      console.log("[StylePanel] mutate", { control: "fontFamily", property: "fontFamily", value: val })
                      onPropertyChange?.(selectedElement.selector, 'fontFamily', val)
                    }
                  }}
                  className="w-full h-7 px-2 rounded-md bg-slate-800 border border-slate-700/60 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="Inter">Inter (Sans-serif)</option>
                  <option value="Roboto">Roboto</option>
                  <option value="System">System UI</option>
                  <option value="Georgia">Georgia (Serif)</option>
                  <option value="Monospace">Monospace</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Font Size</label>
                </div>
                <DebouncedSlider
                  min={8}
                  max={96}
                  value={styles.fontSize}
                  onChange={(val) => {
                    setStyles(prev => ({ ...prev, fontSize: val }))
                    if (selectedElement?.selector) {
                      onFontSizeChange?.(selectedElement.selector, val)
                    }
                  }}
                />
              </div>

              {/* Font Weight & Line Height */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight</label>
                  <select
                    value={styles.fontWeight}
                    onChange={(e) => {
                      const val = e.target.value
                      setStyles(prev => ({ ...prev, fontWeight: val }))
                      if (selectedElement?.selector) {
                        console.log("[StylePanel] mutate", { control: "fontWeight", property: "fontWeight", value: val })
                        onPropertyChange?.(selectedElement.selector, 'fontWeight', val)
                      }
                    }}
                    className="w-full h-7 px-2 rounded-md bg-slate-800 border border-slate-700/60 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="300">300 Light</option>
                    <option value="400">400 Regular</option>
                    <option value="500">500 Medium</option>
                    <option value="600">600 SemiBold</option>
                    <option value="700">700 Bold</option>
                    <option value="800">800 ExtraBold</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Line Height</label>
                  <DebouncedSlider
                    min={0.8}
                    max={3}
                    step={0.1}
                    unit=""
                    value={styles.lineHeight}
                    onChange={(val) => {
                      setStyles(prev => ({ ...prev, lineHeight: val }))
                      if (selectedElement?.selector) {
                        const valueStr = `${val}`
                        console.log("[StylePanel] mutate", { control: "lineHeight", property: "lineHeight", value: valueStr })
                        onPropertyChange?.(selectedElement.selector, 'lineHeight', valueStr)
                      }
                    }}
                  />
                </div>
              </div>

              {/* Letter Spacing */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Letter Spacing</label>
                <DebouncedSlider
                  min={-2}
                  max={10}
                  step={0.5}
                  value={styles.letterSpacing}
                  onChange={(val) => {
                    setStyles(prev => ({ ...prev, letterSpacing: val }))
                    if (selectedElement?.selector) {
                      const valueStr = `${val}px`
                      console.log("[StylePanel] mutate", { control: "letterSpacing", property: "letterSpacing", value: valueStr })
                      onPropertyChange?.(selectedElement.selector, 'letterSpacing', valueStr)
                    }
                  }}
                />
              </div>

              {/* Text Align */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alignment</label>
                <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                  {(['left', 'center', 'right', 'justify'] as const).map((align) => {
                    const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : align === 'right' ? AlignRight : AlignJustify
                    return (
                      <button
                        key={align}
                        onClick={() => {
                          setStyles(prev => ({ ...prev, textAlign: align }))
                          if (selectedElement?.selector) {
                            console.log("[StylePanel] mutate", { control: "textAlign", property: "textAlign", value: align })
                            onPropertyChange?.(selectedElement.selector, 'textAlign', align)
                          }
                        }}
                        className={cn(
                          "h-6 rounded flex items-center justify-center transition-colors",
                          styles.textAlign === align ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Text Color */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Text Color</label>
                <DebouncedColorPicker
                  value={styles.color}
                  onChange={(val) => {
                    setStyles(prev => ({ ...prev, color: val }))
                    if (selectedElement?.selector) {
                      console.log("[StylePanel] mutate", { control: "color", property: "color", value: val })
                      onPropertyChange?.(selectedElement.selector, 'color', val)
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 2: BACKGROUND ────────────────────────────────────── */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800/50 overflow-hidden">
          {/* Header */}
          <div
            onClick={() => setBackgroundOpen(!backgroundOpen)}
            className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              {backgroundOpen ? <ChevronDown className="w-3.5 h-3.5 text-purple-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Background</span>
            </div>

            {/* Inline summary when collapsed */}
            <div className="flex items-center gap-2">
              {!backgroundOpen && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full border border-slate-600" style={{ backgroundColor: styles.backgroundColor }} />
                  <span className="text-[10px] font-mono text-slate-400">{styles.backgroundColor}</span>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleResetBackground()
                }}
                className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Reset Background"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Controls */}
          {backgroundOpen && (
            <div className="p-3 space-y-3 bg-slate-900/40 border-t border-slate-800/40 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Background Color</label>
                <DebouncedColorPicker
                  value={styles.backgroundColor}
                  onChange={(val) => {
                    setStyles(prev => ({ ...prev, backgroundColor: val }))
                    if (selectedElement?.selector) {
                      console.log("[StylePanel] mutate", { control: "backgroundColor", property: "backgroundColor", value: val })
                      onPropertyChange?.(selectedElement.selector, 'backgroundColor', val)
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 3: SPACING (PADDING & MARGIN 4-SIDE BOX MODEL) ──── */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800/50 overflow-hidden">
          {/* Header */}
          <div
            onClick={() => setSpacingOpen(!spacingOpen)}
            className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              {spacingOpen ? <ChevronDown className="w-3.5 h-3.5 text-purple-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              <Box className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Spacing</span>
            </div>

            {/* Inline summary when collapsed */}
            <div className="flex items-center gap-2">
              {!spacingOpen && (
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                  P: {styles.paddingTop} {styles.paddingRight} {styles.paddingBottom} {styles.paddingLeft} | M: {styles.marginTop} {styles.marginRight} {styles.marginBottom} {styles.marginLeft}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleResetSpacing()
                }}
                className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Reset Spacing"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Controls */}
          {spacingOpen && (
            <div className="p-3 space-y-4 bg-slate-900/40 border-t border-slate-800/40 text-xs">
              
              {/* Padding 4-side Box Model */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Padding (px)</label>
                  <button
                    onClick={() => setStyles(prev => ({ ...prev, paddingLinked: !prev.paddingLinked }))}
                    className={cn(
                      "p-1 rounded transition-colors flex items-center gap-1 text-[10px]",
                      styles.paddingLinked ? "bg-purple-600/30 text-purple-300 border border-purple-500/40" : "text-slate-500 hover:text-slate-300"
                    )}
                    title={styles.paddingLinked ? "Unlink sides" : "Link all sides"}
                  >
                    {styles.paddingLinked ? <Link2 className="w-3 h-3 text-purple-400" /> : <Unlink className="w-3 h-3" />}
                    <span className="text-[9px] font-mono">{styles.paddingLinked ? 'Linked' : 'Unlinked'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
                    const key = side === 'top' ? 'paddingTop' : side === 'right' ? 'paddingRight' : side === 'bottom' ? 'paddingBottom' : 'paddingLeft'
                    return (
                      <div key={side} className="space-y-0.5">
                        <input
                          type="number"
                          value={styles[key]}
                          onChange={(e) => handlePaddingChange(side, parseFloat(e.target.value) || 0)}
                          className="w-full h-7 px-1.5 text-center rounded bg-slate-800 border border-slate-700/60 font-mono text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                        <span className="block text-[8px] text-center text-slate-500 uppercase tracking-wider">{side[0].toUpperCase()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Margin 4-side Box Model */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margin (px)</label>
                  <button
                    onClick={() => setStyles(prev => ({ ...prev, marginLinked: !prev.marginLinked }))}
                    className={cn(
                      "p-1 rounded transition-colors flex items-center gap-1 text-[10px]",
                      styles.marginLinked ? "bg-purple-600/30 text-purple-300 border border-purple-500/40" : "text-slate-500 hover:text-slate-300"
                    )}
                    title={styles.marginLinked ? "Unlink sides" : "Link all sides"}
                  >
                    {styles.marginLinked ? <Link2 className="w-3 h-3 text-purple-400" /> : <Unlink className="w-3 h-3" />}
                    <span className="text-[9px] font-mono">{styles.marginLinked ? 'Linked' : 'Unlinked'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
                    const key = side === 'top' ? 'marginTop' : side === 'right' ? 'marginRight' : side === 'bottom' ? 'marginBottom' : 'marginLeft'
                    return (
                      <div key={side} className="space-y-0.5">
                        <input
                          type="number"
                          value={styles[key]}
                          onChange={(e) => handleMarginChange(side, parseFloat(e.target.value) || 0)}
                          className="w-full h-7 px-1.5 text-center rounded bg-slate-800 border border-slate-700/60 font-mono text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                        <span className="block text-[8px] text-center text-slate-500 uppercase tracking-wider">{side[0].toUpperCase()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── SECTION 4: BORDER & BORDER RADIUS ─────────────────────────── */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800/50 overflow-hidden">
          <div className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Square className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Border & Radius</span>
            </div>
          </div>
          <div className="p-3 space-y-3 bg-slate-900/40 border-t border-slate-800/40 text-xs">
            {/* Border Width */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Border Width</label>
              <DebouncedSlider
                min={0}
                max={20}
                value={styles.borderWidth}
                onChange={(val) => {
                  setStyles(prev => ({ ...prev, borderWidth: val }))
                  if (selectedElement?.selector) {
                    onPropertyChange?.(selectedElement.selector, 'borderWidth', `${val}px`)
                  }
                }}
              />
            </div>
            {/* Border Style */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Border Style</label>
              <select
                value={styles.borderStyle}
                onChange={(e) => {
                  const val = e.target.value
                  setStyles(prev => ({ ...prev, borderStyle: val }))
                  if (selectedElement?.selector) {
                    onPropertyChange?.(selectedElement.selector, 'borderStyle', val)
                  }
                }}
                className="w-full h-7 px-2 rounded-md bg-slate-800 border border-slate-700/60 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="none">None</option>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
                <option value="double">Double</option>
              </select>
            </div>
            {/* Border Color */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Border Color</label>
              <DebouncedColorPicker
                value={styles.borderColor}
                onChange={(val) => {
                  setStyles(prev => ({ ...prev, borderColor: val }))
                  if (selectedElement?.selector) {
                    onPropertyChange?.(selectedElement.selector, 'borderColor', val)
                  }
                }}
              />
            </div>
            {/* Border Radius 4-Corner Model */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corner Radius (px)</label>
                <button
                  onClick={() => setStyles(prev => ({ ...prev, borderRadiusLinked: !prev.borderRadiusLinked }))}
                  className={cn(
                    "p-1 rounded transition-colors flex items-center gap-1 text-[10px]",
                    styles.borderRadiusLinked ? "bg-purple-600/30 text-purple-300 border border-purple-500/40" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {styles.borderRadiusLinked ? <Link2 className="w-3 h-3 text-purple-400" /> : <Unlink className="w-3 h-3" />}
                  <span className="text-[9px] font-mono">{styles.borderRadiusLinked ? 'Linked' : 'Unlinked'}</span>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['TL', 'TR', 'BR', 'BL'] as const).map((corner) => {
                  const key = corner === 'TL' ? 'borderTopLeftRadius' : corner === 'TR' ? 'borderTopRightRadius' : corner === 'BR' ? 'borderBottomRightRadius' : 'borderBottomLeftRadius'
                  const cssProp = corner === 'TL' ? 'borderTopLeftRadius' : corner === 'TR' ? 'borderTopRightRadius' : corner === 'BR' ? 'borderBottomRightRadius' : 'borderBottomLeftRadius'
                  return (
                    <div key={corner} className="space-y-0.5">
                      <input
                        type="number"
                        value={styles[key]}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setStyles(prev => {
                            if (prev.borderRadiusLinked) {
                              return { ...prev, borderTopLeftRadius: val, borderTopRightRadius: val, borderBottomRightRadius: val, borderBottomLeftRadius: val }
                            }
                            return { ...prev, [key]: val }
                          })
                          if (selectedElement?.selector) {
                            if (styles.borderRadiusLinked) {
                              onPropertyChange?.(selectedElement.selector, 'borderRadius', `${val}px`)
                            } else {
                              onPropertyChange?.(selectedElement.selector, cssProp, `${val}px`)
                            }
                          }
                        }}
                        className="w-full h-7 px-1.5 text-center rounded bg-slate-800 border border-slate-700/60 font-mono text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                      <span className="block text-[8px] text-center text-slate-500 uppercase tracking-wider">{corner}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 5: VISIBILITY & OPACITY ────────────────────────────── */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800/50 overflow-hidden">
          <div className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Visibility & Opacity</span>
            </div>
          </div>
          <div className="p-3 space-y-3 bg-slate-900/40 border-t border-slate-800/40 text-xs">
            {/* Show / Hide Toggle (Preserves Original Display Value on Show) */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Element Visibility</label>
              <button
                onClick={() => {
                  const newHidden = !styles.displayHidden
                  setStyles(prev => ({ ...prev, displayHidden: newHidden }))
                  if (selectedElement?.selector) {
                    onPropertyChange?.(selectedElement.selector, 'display', newHidden ? 'none' : '')
                  }
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border",
                  styles.displayHidden ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                )}
              >
                {styles.displayHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{styles.displayHidden ? 'Hidden (display:none)' : 'Visible'}</span>
              </button>
            </div>
            {/* Opacity */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opacity</label>
              <DebouncedSlider
                min={0}
                max={1}
                step={0.05}
                unit=""
                value={styles.opacity}
                onChange={(val) => {
                  setStyles(prev => ({ ...prev, opacity: val }))
                  if (selectedElement?.selector) {
                    onPropertyChange?.(selectedElement.selector, 'opacity', `${val}`)
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 6: BOX SHADOW ──────────────────────────────────────── */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800/50 overflow-hidden">
          <div className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Box Shadow</span>
            </div>
          </div>
          <div className="p-3 space-y-3 bg-slate-900/40 border-t border-slate-800/40 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Offset X</label>
                <DebouncedSlider
                  min={-50}
                  max={50}
                  value={styles.shadowX}
                  onChange={(val) => {
                    setStyles(prev => {
                      const next = { ...prev, shadowX: val }
                      if (selectedElement?.selector) {
                        onPropertyChange?.(selectedElement.selector, 'boxShadow', `${next.shadowX}px ${next.shadowY}px ${next.shadowBlur}px ${next.shadowSpread}px ${next.shadowColor}`)
                      }
                      return next
                    })
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Offset Y</label>
                <DebouncedSlider
                  min={-50}
                  max={50}
                  value={styles.shadowY}
                  onChange={(val) => {
                    setStyles(prev => {
                      const next = { ...prev, shadowY: val }
                      if (selectedElement?.selector) {
                        onPropertyChange?.(selectedElement.selector, 'boxShadow', `${next.shadowX}px ${next.shadowY}px ${next.shadowBlur}px ${next.shadowSpread}px ${next.shadowColor}`)
                      }
                      return next
                    })
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blur</label>
                <DebouncedSlider
                  min={0}
                  max={100}
                  value={styles.shadowBlur}
                  onChange={(val) => {
                    setStyles(prev => {
                      const next = { ...prev, shadowBlur: val }
                      if (selectedElement?.selector) {
                        onPropertyChange?.(selectedElement.selector, 'boxShadow', `${next.shadowX}px ${next.shadowY}px ${next.shadowBlur}px ${next.shadowSpread}px ${next.shadowColor}`)
                      }
                      return next
                    })
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spread</label>
                <DebouncedSlider
                  min={-50}
                  max={50}
                  value={styles.shadowSpread}
                  onChange={(val) => {
                    setStyles(prev => {
                      const next = { ...prev, shadowSpread: val }
                      if (selectedElement?.selector) {
                        onPropertyChange?.(selectedElement.selector, 'boxShadow', `${next.shadowX}px ${next.shadowY}px ${next.shadowBlur}px ${next.shadowSpread}px ${next.shadowColor}`)
                      }
                      return next
                    })
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shadow Color</label>
              <DebouncedColorPicker
                value={styles.shadowColor}
                onChange={(val) => {
                  setStyles(prev => {
                    const next = { ...prev, shadowColor: val }
                    if (selectedElement?.selector) {
                      onPropertyChange?.(selectedElement.selector, 'boxShadow', `${next.shadowX}px ${next.shadowY}px ${next.shadowBlur}px ${next.shadowSpread}px ${next.shadowColor}`)
                    }
                    return next
                  })
                }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── PANEL FOOTER ────────────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>Step 7 Complete DOM Inspector</span>
        <span className="text-purple-400 font-semibold">Wired Live & Persisted</span>
      </div>

    </div>
  )
})

StylePanel.displayName = 'StylePanel'
