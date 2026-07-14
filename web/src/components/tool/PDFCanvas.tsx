'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { getPDFJS } from '@/lib/pdfjs'
import { getPDFUrl } from '@/lib/api'

interface Selection {
  x: number; y: number; w: number; h: number
}

interface Props {
  fileId: string
  pageWidth: number
  pageHeight: number
  selection: Selection
  cols: number
  onSelectionChange: (sel: Selection) => void
}

type DragType = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | null

function normalizeSel(s: Selection): Selection {
  return {
    x: s.w < 0 ? s.x + s.w : s.x,
    y: s.h < 0 ? s.y + s.h : s.y,
    w: Math.abs(s.w),
    h: Math.abs(s.h),
  }
}

export default function PDFCanvas({ fileId, pageWidth, pageHeight, selection, cols, onSelectionChange }: Props) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const selCanvasRef = useRef<HTMLCanvasElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [scale, setScale] = useState(1)
  const [baseScale, setBaseScale] = useState(1)
  const [zoom, setZoom] = useState(1)

  const dragRef = useRef<{
    active: boolean
    type: DragType
    startX: number
    startY: number
    initSel: Selection
  }>({ active: false, type: null, startX: 0, startY: 0, initSel: { x: 0, y: 0, w: 0, h: 0 } })

  const selRef = useRef(selection)
  selRef.current = selection

  useEffect(() => {
    setPdfLoaded(false)
  }, [fileId])

  useEffect(() => {
    const c = outerRef.current
    if (!c || !pageWidth) return
    const targetW = c.clientWidth - 8
    const s = targetW / pageWidth
    setScale(s)
    setBaseScale(s)
    setZoom(1)
  }, [pageWidth, pageHeight, fileId])

  useEffect(() => {
    const canvas = pdfCanvasRef.current
    const selCanvas = selCanvasRef.current
    if (!canvas || !selCanvas || !scale) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cancelled = false

    async function render() {
      const pdfjs = await getPDFJS()
      const sc = selCanvasRef.current
      if (cancelled || !canvas || !sc || !ctx) return
      try {
        const pdfData = await fetch(getPDFUrl(fileId)).then(r => r.arrayBuffer())
        if (cancelled) return
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale })

        canvas.width = viewport.width
        canvas.height = viewport.height
        sc.width = viewport.width
        sc.height = viewport.height

        await page.render({ canvas: canvas, viewport }).promise
        setPdfLoaded(true)
        drawSelection()
      } catch (err) {
        console.error('PDF render error:', err)
      }
    }

    render()
    return () => { cancelled = true }
  }, [fileId, scale])

  const drawSelection = useCallback(() => {
    const canvas = selCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y, w, h } = normalizeSel(selRef.current)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (w < 1 && h < 1) return

    const sx = x * scale
    const sy = y * scale
    const sw = w * scale
    const sh = h * scale

    ctx.fillStyle = 'rgba(25, 118, 210, 0.1)'
    ctx.fillRect(sx, sy, sw, sh)
    ctx.strokeStyle = '#1976d2'
    ctx.lineWidth = 2
    ctx.strokeRect(sx, sy, sw, sh)

    if (cols > 1 && sw > 10) {
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = '#f44336'
      const step = sw / cols
      for (let i = 1; i < cols; i++) {
        ctx.beginPath()
        ctx.moveTo(sx + step * i, sy)
        ctx.lineTo(sx + step * i, sy + sh)
        ctx.stroke()
      }
      ctx.setLineDash([])
    }

    if (sw > 20 && sh > 20) {
      const hs = 5
      ctx.fillStyle = 'white'
      ctx.strokeStyle = '#1976d2'
      ctx.lineWidth = 2
      const corners: [number, number][] = [
        [sx, sy], [sx + sw, sy], [sx, sy + sh], [sx + sw, sy + sh],
        [sx + sw / 2, sy], [sx + sw / 2, sy + sh], [sx, sy + sh / 2], [sx + sw, sy + sh / 2],
      ]
      corners.forEach(([hx, hy]) => {
        ctx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2)
        ctx.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2)
      })
    }
  }, [scale, cols])

  useEffect(() => {
    if (pdfLoaded) drawSelection()
  }, [drawSelection, selection, cols, pdfLoaded])

  const getHandleAt = useCallback((mx: number, my: number) => {
    const { x, y, w, h } = normalizeSel(selRef.current)
    if (w < 10 || h < 10) return null
    const sx = x * scale
    const sy = y * scale
    const sw = w * scale
    const sh = h * scale
    const s = 8

    if (Math.abs(mx - sx) < s && Math.abs(my - sy) < s) return 'nw'
    if (Math.abs(mx - (sx + sw)) < s && Math.abs(my - sy) < s) return 'ne'
    if (Math.abs(mx - sx) < s && Math.abs(my - (sy + sh)) < s) return 'sw'
    if (Math.abs(mx - (sx + sw)) < s && Math.abs(my - (sy + sh)) < s) return 'se'
    if (Math.abs(my - sy) < s && mx > sx + s && mx < sx + sw - s) return 'n'
    if (Math.abs(my - (sy + sh)) < s && mx > sx + s && mx < sx + sw - s) return 's'
    if (Math.abs(mx - sx) < s && my > sy + s && my < sy + sh - s) return 'w'
    if (Math.abs(mx - (sx + sw)) < s && my > sy + s && my < sy + sh - s) return 'e'
    return null
  }, [scale])

  const isInsideSelection = useCallback((mx: number, my: number) => {
    const { x, y, w, h } = normalizeSel(selRef.current)
    const sx = x * scale
    const sy = y * scale
    const sw = w * scale
    const sh = h * scale
    return mx > sx + 8 && mx < sx + sw - 8 && my > sy + 8 && my < sy + sh - 8
  }, [scale])

  useEffect(() => {
    const canvas = selCanvasRef.current
    if (!canvas) return

    const getPos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = getPos(e)
      e.preventDefault()

      const handle = getHandleAt(x, y)
      if (handle) {
        dragRef.current = { active: true, type: handle, startX: x, startY: y, initSel: { ...normalizeSel(selRef.current) } }
        return
      }

      if (isInsideSelection(x, y)) {
        dragRef.current = { active: true, type: 'move', startX: x, startY: y, initSel: { ...normalizeSel(selRef.current) } }
        return
      }

      dragRef.current = { active: true, type: null, startX: x, startY: y, initSel: { x: x / scale, y: y / scale, w: 0, h: 0 } }
      onSelectionChange({ x: x / scale, y: y / scale, w: 0, h: 0 })
    }

    const onMouseMove = (e: MouseEvent) => {
      const { x, y } = getPos(e)
      const drag = dragRef.current

      if (!drag.active) {
        const handle = getHandleAt(x, y)
        const cursors: Record<string, string> = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize', n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize' }
        canvas.style.cursor = handle ? cursors[handle] : isInsideSelection(x, y) ? 'move' : 'crosshair'
        return
      }

      const dx = (x - drag.startX) / scale
      const dy = (y - drag.startY) / scale
      let newSel = { ...selRef.current }

      if (drag.type === null) {
        newSel = { x: drag.initSel.x, y: drag.initSel.y, w: dx, h: dy }
      } else if (drag.type === 'move') {
        newSel.x = Math.max(0, Math.min(pageWidth - Math.abs(drag.initSel.w), drag.initSel.x + dx))
        newSel.y = Math.max(0, Math.min(pageHeight - Math.abs(drag.initSel.h), drag.initSel.y + dy))
      } else {
        const r = (t: string, dx: number, dy: number) => {
          const { x, y, w, h } = drag.initSel
          switch (t) {
            case 'nw': return { x: x + dx, y: y + dy, w: w - dx, h: h - dy }
            case 'ne': return { x, y: y + dy, w: w + dx, h: h - dy }
            case 'sw': return { x: x + dx, y, w: w - dx, h: h + dy }
            case 'se': return { x, y, w: w + dx, h: h + dy }
            case 'n': return { x, y: y + dy, w, h: h - dy }
            case 's': return { x, y, w, h: h + dy }
            case 'w': return { x: x + dx, y, w: w - dx, h }
            case 'e': return { x, y, w: w + dx, h }
            default: return { x, y, w, h }
          }
        }
        newSel = r(drag.type, dx, dy)
      }

      onSelectionChange(newSel)
    }

    const onMouseUp = () => {
      if (dragRef.current.active) {
        onSelectionChange(normalizeSel(selRef.current))
      }
      dragRef.current.active = false
    }

    const onMouseLeave = () => {
      if (dragRef.current.active) {
        onSelectionChange(normalizeSel(selRef.current))
      }
      dragRef.current.active = false
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [scale, pageWidth, pageHeight, getHandleAt, isInsideSelection, onSelectionChange])

  const nsel = normalizeSel(selection)
  const adjX = Math.round(nsel.x)
  const adjY = Math.round(nsel.y)
  const adjW = Math.round(nsel.w)
  const adjH = Math.round(nsel.h)

  const updateFromInput = (field: keyof Selection, val: number) => {
    const s = { ...selection }
    s[field] = val
    onSelectionChange(s)
  }

  const handleZoom = (delta: number) => {
    const newZ = Math.max(0.5, Math.min(3, zoom + delta))
    setZoom(newZ)
    setScale(baseScale * newZ)
  }

  const fitToWidth = () => {
    const c = outerRef.current
    if (!c) return
    const targetW = c.clientWidth - 8
    const s = targetW / pageWidth
    setScale(s)
    setBaseScale(s)
    setZoom(1)
  }

  return (
    <div ref={outerRef}>
      {pdfLoaded && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
          <button onClick={() => handleZoom(-0.25)} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">−</button>
          <span className="min-w-[3ch] text-center text-gray-600">{Math.round(zoom * 100)}%</span>
          <button onClick={() => handleZoom(0.25)} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">+</button>
          <button onClick={fitToWidth} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50">适应宽度</button>

          <div className="ml-4 flex items-center gap-3">
            <label className="text-xs text-gray-400">X: <input type="number" value={adjX} onChange={e => updateFromInput('x', +e.target.value)} className="w-16 px-2 py-1 border border-gray-200 rounded text-sm" /></label>
            <label className="text-xs text-gray-400">Y: <input type="number" value={adjY} onChange={e => updateFromInput('y', +e.target.value)} className="w-16 px-2 py-1 border border-gray-200 rounded text-sm" /></label>
            <label className="text-xs text-gray-400">宽: <input type="number" value={adjW} onChange={e => updateFromInput('w', +e.target.value)} className="w-16 px-2 py-1 border border-gray-200 rounded text-sm" /></label>
            <label className="text-xs text-gray-400">高: <input type="number" value={adjH} onChange={e => updateFromInput('h', +e.target.value)} className="w-16 px-2 py-1 border border-gray-200 rounded text-sm" /></label>
            <span className="text-xs text-gray-400">（PDF坐标，直接输入调整）</span>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="text-center text-sm text-primary py-2 bg-blue-50 rounded-t-lg">
          {pdfLoaded ? '鼠标框选区域，拖动角/边调整大小，或在上方输入精确坐标' : '正在加载 PDF...'}
        </div>
        <div ref={scrollRef} className="overflow-auto max-h-[70vh] border border-gray-100 rounded-b-lg">
          <div className="relative inline-block">
            <canvas ref={pdfCanvasRef} />
            <canvas ref={selCanvasRef} className="absolute top-0 left-0 z-10" />
          </div>
        </div>
      </div>
    </div>
  )
}
