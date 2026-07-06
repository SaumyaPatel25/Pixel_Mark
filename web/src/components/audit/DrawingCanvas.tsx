'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Undo2, Trash2, Type, Square, Paintbrush } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Point {
  x: number // ratio (0-1)
  y: number // ratio (0-1)
}

type Shape =
  | { type: 'brush'; points: Point[]; color: string; size: number }
  | { type: 'rectangle'; x: number; y: number; w: number; h: number; color: string; size: number }
  | { type: 'text'; x: number; y: number; text: string; color: string; size: number }

interface DrawingCanvasProps {
  baseImageUrl: string
  onSave: (annotatedDataUrl: string, shapes: Shape[]) => void
  initialShapes?: Shape[]
}

const COLOR_PALETTE = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#ffffff', // White
]

function setupCanvasForDPR(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(cssWidth * dpr)
  canvas.height = Math.round(cssHeight * dpr)
  canvas.style.width = cssWidth + "px"
  canvas.style.height = cssHeight + "px"
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // Draw using CSS pixel coordinates directly
  }
  return ctx
}

function getCanvasRelativePointerPosition(canvas: HTMLCanvasElement, evt: React.PointerEvent<HTMLCanvasElement> | PointerEvent) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  }
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, cssWidth: number, cssHeight: number) {
  ctx.strokeStyle = shape.color
  ctx.fillStyle = shape.color
  ctx.lineWidth = shape.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (shape.type === 'brush') {
    if (shape.points.length < 2) return
    ctx.beginPath()
    ctx.moveTo(shape.points[0].x * cssWidth, shape.points[0].y * cssHeight)
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x * cssWidth, shape.points[i].y * cssHeight)
    }
    ctx.stroke()
  } else if (shape.type === 'rectangle') {
    ctx.beginPath()
    const rx = shape.x * cssWidth
    const ry = shape.y * cssHeight
    const rw = shape.w * cssWidth
    const rh = shape.h * cssHeight
    ctx.rect(rx, ry, rw, rh)
    ctx.stroke()
  } else if (shape.type === 'text') {
    ctx.font = `bold ${shape.size}px system-ui, sans-serif`
    ctx.fillText(shape.text, shape.x * cssWidth, shape.y * cssHeight)
  }
}

export function DrawingCanvas({ baseImageUrl, onSave, initialShapes = [] }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [imageLoaded, setImageLoaded] = useState(false)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const [tool, setTool] = useState<'brush' | 'rectangle' | 'text'>('brush')
  const [color, setColor] = useState('#ef4444')
  const [brushSize, setBrushSize] = useState(4)
  const [textSize, setTextSize] = useState(16)

  const [shapes, setShapes] = useState<Shape[]>(initialShapes)
  const [isDrawing, setIsDrawing] = useState(false)

  // Current active shape state (in ratio coordinates)
  const [activeBrushPoints, setActiveBrushPoints] = useState<Point[]>([])
  const [activeDragStart, setActiveDragStart] = useState<Point | null>(null)
  const [activeDragCurrent, setActiveDragCurrent] = useState<Point | null>(null)

  // Load image first
  useEffect(() => {
    setImageLoaded(false)
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
      setImageLoaded(true)
      console.log("PixelMark annotation image natural size:", img.naturalWidth, img.naturalHeight)
    }
    img.src = baseImageUrl
  }, [baseImageUrl])

  // Track responsive canvas layout size
  const updateCanvasLayoutSize = () => {
    if (imageRef.current) {
      const { clientWidth, clientHeight } = imageRef.current
      setCanvasSize({ width: clientWidth, height: clientHeight })
    }
  }

  // Handle onload of inline image
  const handleImageLoad = () => {
    updateCanvasLayoutSize()
  }

  // Handle window resizing
  useEffect(() => {
    window.addEventListener('resize', updateCanvasLayoutSize)
    return () => window.removeEventListener('resize', updateCanvasLayoutSize)
  }, [imageLoaded])

  // Re-draw loop using requestAnimationFrame
  useEffect(() => {
    if (!imageLoaded || canvasSize.width === 0 || canvasSize.height === 0) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = setupCanvasForDPR(canvas, canvasSize.width, canvasSize.height)
    if (!ctx) return

    let rAFId = 0
    const draw = () => {
      // 1. Clear canvas
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

      // 2. Draw base image
      const img = imageRef.current
      if (img) {
        ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height)
      }

      // 3. Draw committed shapes
      for (const shape of shapes) {
        drawShape(ctx, shape, canvasSize.width, canvasSize.height)
      }

      // 4. Draw active/in-progress shape
      if (isDrawing) {
        if (tool === 'brush' && activeBrushPoints.length > 0) {
          drawShape(ctx, {
            type: 'brush',
            points: activeBrushPoints,
            color,
            size: brushSize
          }, canvasSize.width, canvasSize.height)
        } else if (tool === 'rectangle' && activeDragStart && activeDragCurrent) {
          const rx = Math.min(activeDragStart.x, activeDragCurrent.x)
          const ry = Math.min(activeDragStart.y, activeDragCurrent.y)
          const rw = Math.abs(activeDragStart.x - activeDragCurrent.x)
          const rh = Math.abs(activeDragStart.y - activeDragCurrent.y)
          drawShape(ctx, {
            type: 'rectangle',
            x: rx, y: ry, w: rw, h: rh,
            color,
            size: brushSize
          }, canvasSize.width, canvasSize.height)
        }
      }
    }

    rAFId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rAFId)
  }, [imageLoaded, canvasSize, shapes, isDrawing, activeBrushPoints, activeDragStart, activeDragCurrent, tool, color, brushSize])

  // Flatten drawing and trigger parent callback
  const triggerSave = (currentShapes: Shape[]) => {
    const img = imageRef.current
    if (!img) return

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = img.naturalWidth || 800
    tempCanvas.height = img.naturalHeight || 600
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    // 1. Draw base image at full natural resolution
    tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height)

    // 2. Draw all shapes
    currentShapes.forEach(shape => {
      // Calculate scale factor relative to current UI size
      const scaleX = tempCanvas.width / (canvasSize.width || 1)
      const scaleY = tempCanvas.height / (canvasSize.height || 1)
      const scaleAvg = (scaleX + scaleY) / 2

      const scaledShape = {
        ...shape,
        size: shape.size * scaleAvg
      }
      drawShape(tempCtx, scaledShape, tempCanvas.width, tempCanvas.height)
    })

    const flattenedDataUrl = tempCanvas.toDataURL('image/png')
    onSave(flattenedDataUrl, currentShapes)
  }

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return

    canvas.setPointerCapture(e.pointerId)
    const pos = getCanvasRelativePointerPosition(canvas, e)
    const ratioX = pos.x / canvasSize.width
    const ratioY = pos.y / canvasSize.height
    
    setIsDrawing(true)

    if (tool === 'brush') {
      setActiveBrushPoints([{ x: ratioX, y: ratioY }])
    } else if (tool === 'rectangle') {
      setActiveDragStart({ x: ratioX, y: ratioY })
      setActiveDragCurrent({ x: ratioX, y: ratioY })
    } else if (tool === 'text') {
      const text = prompt('Enter annotation text:')
      if (text && text.trim()) {
        const newShape: Shape = {
          type: 'text',
          x: ratioX,
          y: ratioY,
          text: text.trim(),
          color,
          size: textSize
        }
        const updated = [...shapes, newShape]
        setShapes(updated)
        triggerSave(updated)
      }
      setIsDrawing(false)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return

    const pos = getCanvasRelativePointerPosition(canvas, e)
    const ratioX = pos.x / canvasSize.width
    const ratioY = pos.y / canvasSize.height

    if (tool === 'brush') {
      setActiveBrushPoints(prev => [...prev, { x: ratioX, y: ratioY }])
    } else if (tool === 'rectangle') {
      setActiveDragCurrent({ x: ratioX, y: ratioY })
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (canvas) {
      try { canvas.releasePointerCapture(e.pointerId) } catch (_) {}
    }
    setIsDrawing(false)

    if (tool === 'brush' && activeBrushPoints.length > 1) {
      const newShape: Shape = {
        type: 'brush',
        points: activeBrushPoints,
        color,
        size: brushSize
      }
      const updated = [...shapes, newShape]
      setShapes(updated)
      triggerSave(updated)
      setActiveBrushPoints([])
    } else if (tool === 'rectangle' && activeDragStart && activeDragCurrent) {
      const rx = Math.min(activeDragStart.x, activeDragCurrent.x)
      const ry = Math.min(activeDragStart.y, activeDragCurrent.y)
      const rw = Math.abs(activeDragStart.x - activeDragCurrent.x)
      const rh = Math.abs(activeDragStart.y - activeDragCurrent.y)

      if (rw > 0.005 && rh > 0.005) {
        const newShape: Shape = {
          type: 'rectangle',
          x: rx, y: ry, w: rw, h: rh,
          color,
          size: brushSize
        }
        const updated = [...shapes, newShape]
        setShapes(updated)
        triggerSave(updated)
      }
      setActiveDragStart(null)
      setActiveDragCurrent(null)
    }
  }

  const handleUndo = () => {
    if (shapes.length === 0) return
    const updated = shapes.slice(0, -1)
    setShapes(updated)
    triggerSave(updated)
  }

  const handleClear = () => {
    setShapes([])
    triggerSave([])
  }

  return (
    <div className="flex flex-col gap-3 w-full items-stretch">
      {/* Visual Canvas Container */}
      <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/40 flex justify-center items-center select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={baseImageUrl}
          alt="Base evidence screenshot"
          className="w-full h-auto max-h-[300px] object-contain select-none pointer-events-none opacity-0"
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
        />
        {imageLoaded && (
          <canvas
            ref={canvasRef}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-crosshair touch-none select-none z-10"
            style={{ pointerEvents: 'auto', touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        )}
      </div>

      {/* Drawing toolbar */}
      <div className="flex flex-col gap-2 bg-white/[0.03] border border-white/5 rounded-xl p-3">
        {/* Row 1: Tools & Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Tool select */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg">
            {(['brush', 'rectangle', 'text'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTool(t)}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  tool === t ? "bg-purple-600 text-white" : "text-white/40 hover:text-white/70"
                )}
                title={`${t.charAt(0).toUpperCase() + t.slice(1)} Tool`}
              >
                {t === 'brush' && <Paintbrush className="w-3.5 h-3.5" />}
                {t === 'rectangle' && <Square className="w-3.5 h-3.5" />}
                {t === 'text' && <Type className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              key="undo-btn"
              type="button"
              onClick={handleUndo}
              disabled={shapes.length === 0}
              className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-white/50 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
              title="Undo Last Action"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              key="clear-btn"
              type="button"
              onClick={handleClear}
              disabled={shapes.length === 0}
              className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-white/50 hover:text-red-400 transition-all disabled:opacity-30 disabled:pointer-events-none"
              title="Clear Annotation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Color Picker & size */}
        <div className="flex items-center justify-between gap-4 mt-1 border-t border-white/5 pt-2">
          <div className="flex gap-1.5 items-center">
            {COLOR_PALETTE.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "w-5 h-5 rounded-full border transition-all flex items-center justify-center",
                  c === '#ffffff' ? 'border-white/20' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              >
                {color === c && (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    c === '#ffffff' ? 'bg-black' : 'bg-white'
                  )} />
                )}
              </button>
            ))}
          </div>

          {/* Sizes */}
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black uppercase text-white/30 tracking-wider">
              {tool === 'text' ? 'Text Size' : 'Size'}
            </span>
            {tool === 'text' ? (
              <input
                type="range"
                min="12"
                max="36"
                value={textSize}
                onChange={e => setTextSize(Number(e.target.value))}
                className="w-16 h-1 rounded-lg appearance-none cursor-pointer bg-white/10 accent-purple-500"
              />
            ) : (
              <input
                type="range"
                min="2"
                max="10"
                value={brushSize}
                onChange={e => setBrushSize(Number(e.target.value))}
                className="w-16 h-1 rounded-lg appearance-none cursor-pointer bg-white/10 accent-purple-500"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
