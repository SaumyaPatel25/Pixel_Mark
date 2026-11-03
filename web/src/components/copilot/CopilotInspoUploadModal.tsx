'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  X,
  Sparkles,
  AlertCircle,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CopilotInspoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmitInspo: (inspo: { imageUrl: string; prompt: string }) => void
  initialInspo?: { imageUrl: string; prompt: string } | null
}

export function CopilotInspoUploadModal({
  isOpen,
  onClose,
  onSubmitInspo,
  initialInspo = null,
}: CopilotInspoUploadModalProps) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [promptText, setPromptText] = useState<string>('')
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState<string>('')
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (initialInspo) {
        setImageUrl(initialInspo.imageUrl || '')
        setPromptText(initialInspo.prompt || '')
        if (initialInspo.imageUrl && !initialInspo.imageUrl.startsWith('data:')) {
          setUrlInput(initialInspo.imageUrl)
        }
      } else {
        setImageUrl('')
        setPromptText('')
        setUrlInput('')
      }
      setFileError(null)
      setIsDragging(false)
    }
  }, [isOpen, initialInspo])

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setFileError('Please select a valid image file (PNG, JPG, WebP, SVG).')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setFileError('Image file is too large (maximum 8MB).')
      return
    }
    setFileError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const res = e.target?.result as string
      if (res) {
        setImageUrl(res)
      }
    }
    reader.onerror = () => {
      setFileError('Failed to read image file. Please try another.')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      processFile(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) {
      setFileError('Please enter a valid image URL.')
      return
    }
    setImageUrl(trimmed)
    setFileError(null)
  }

  const handleClearImage = () => {
    setImageUrl('')
    setUrlInput('')
    setFileError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!imageUrl.trim()) {
      setFileError('Please provide an inspiration image by uploading or entering a URL.')
      return
    }

    onSubmitInspo({
      imageUrl: imageUrl.trim(),
      prompt: promptText.trim() || 'Style elements to match this visual aesthetic.',
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspo-modal-title"
    >
      <div className="relative w-full max-w-xl bg-[#0e0e17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="inspo-modal-title"
                className="text-sm font-extrabold tracking-wide text-white flex items-center gap-2"
              >
                Attach Visual Inspiration
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  AI Style Guide
                </span>
              </h2>
              <p className="text-[11px] text-white/50">
                Upload a screenshot or design asset. AI will synthesize its color palette, typography, and layout rhythm.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {fileError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{fileError}</span>
            </div>
            <button
              type="button"
              onClick={() => setFileError(null)}
              className="text-rose-400 hover:text-rose-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Mode Tabs */}
          <div className="flex items-center gap-2 p-1 bg-white/[0.03] border border-white/5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={cn(
                "flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all cursor-pointer",
                inputMode === 'upload'
                  ? "bg-violet-600/30 text-white border border-violet-500/40 shadow-sm"
                  : "text-white/50 hover:text-white"
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={cn(
                "flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all cursor-pointer",
                inputMode === 'url'
                  ? "bg-violet-600/30 text-white border border-violet-500/40 shadow-sm"
                  : "text-white/50 hover:text-white"
              )}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Paste Image URL
            </button>
          </div>

          {/* Image Picker or URL Input */}
          {!imageUrl ? (
            inputMode === 'upload' ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-8 rounded-2xl border-2 border-dashed text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                  isDragging
                    ? "border-violet-500 bg-violet-950/20 shadow-lg shadow-violet-950/40"
                    : "border-white/10 hover:border-violet-500/40 bg-white/[0.01] hover:bg-white/[0.03]"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="p-3 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Click to browse or drag & drop image
                  </p>
                  <p className="text-[11px] text-white/40 mt-1">
                    PNG, JPG, WebP, or SVG up to 8MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70 block">
                  Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/screenshot.png"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/60"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Load
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Image Preview */
            <div className="relative rounded-xl border border-white/15 bg-black/50 p-2 overflow-hidden group">
              <div className="relative max-h-48 w-full flex items-center justify-center overflow-hidden rounded-lg bg-black/70">
                <img
                  src={imageUrl}
                  alt="Inspiration Preview"
                  className="max-h-48 object-contain w-auto rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={handleClearImage}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-black/80 hover:bg-rose-900/80 border border-white/20 text-white transition-colors cursor-pointer"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="mt-2 px-1 flex items-center justify-between text-[11px] text-white/40">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3 h-3" /> Image attached
                </span>
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="text-white/40 hover:text-white underline cursor-pointer"
                >
                  Replace image
                </button>
              </div>
            </div>
          )}

          {/* Guidance Prompt Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/80 flex items-center justify-between">
              <span>Guidance Prompt (Optional)</span>
              <span className="text-[10px] text-white/40">Directs AI focus</span>
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g., Style header & cards to match this clean minimal palette, improve button contrast..."
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/60 leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!imageUrl.trim()}
            className={cn(
              "px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
              "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-900/40 border border-violet-400/40"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-200" />
            <span>Apply Inspiration</span>
          </button>
        </div>
      </div>
    </div>
  )
}
