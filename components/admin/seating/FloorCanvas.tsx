'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize, Minus, Plus } from 'lucide-react'
import {
  SEATING_KINDS,
  SEATING_WORLD,
  clampSeating,
  formatDimensions,
  seatingFootprint,
  seatingKeepInside,
  seatingMaxSize,
  snapSeating,
  type SeatingItem,
} from '@/lib/seating'

const PXM = 40
const MIN_ZOOM = 0.35
const MAX_ZOOM = 3
const TAP_MS = 300
const TAP_SLOP = 8

type Gesture =
  | { mode: 'pan'; lastX: number; lastY: number; downX: number; downY: number; downAt: number; moved: boolean }
  | {
      mode: 'item'
      id: string
      canDrag: boolean
      startX: number
      startY: number
      origX: number
      origY: number
      downAt: number
      moved: boolean
    }
  | { mode: 'resize'; id: string; startX: number; startY: number; origW: number; origH: number }
  | { mode: 'pinch'; prevDist: number; prevZoom: number }

interface FloorCanvasProps {
  items: SeatingItem[]
  selectedId: string | null
  readOnly: boolean
  occupiedByTable: Map<string, number>
  onSelect: (id: string | null) => void
  onMoveItem: (id: string, x: number, y: number) => void
  onResizeItem: (id: string, w: number, h: number, x: number, y: number) => void
}

export default function FloorCanvas({
  items,
  selectedId,
  readOnly,
  occupiedByTable,
  onSelect,
  onMoveItem,
  onResizeItem,
}: FloorCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const gestureRef = useRef<Gesture | null>(null)
  const [view, setView] = useState({ panX: 0, panY: 0, zoom: 1 })

  const worldW = SEATING_WORLD.w * PXM
  const worldH = SEATING_WORLD.h * PXM

  const fitView = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const zoom = clampSeating(
      Math.min(rect.width / (worldW + 48), rect.height / (worldH + 48)),
      MIN_ZOOM,
      MAX_ZOOM,
    )
    setView({
      panX: (rect.width - worldW * zoom) / 2,
      panY: (rect.height - worldH * zoom) / 2,
      zoom,
    })
  }, [worldW, worldH])

  useEffect(() => {
    fitView()
    const onResize = () => fitView()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [fitView])

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setView((prev) => {
      const nextZoom = clampSeating(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM)
      if (nextZoom === prev.zoom) return prev
      const wx = (cx - prev.panX) / prev.zoom
      const wy = (cy - prev.panY) / prev.zoom
      return {
        zoom: nextZoom,
        panX: cx - wx * nextZoom,
        panY: cy - wy * nextZoom,
      }
    })
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX - rect.left, event.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const startPinch = () => {
    const points = [...pointersRef.current.values()]
    if (points.length < 2) return
    gestureRef.current = {
      mode: 'pinch',
      prevDist: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
      prevZoom: view.zoom,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current
    if (!el) return
    el.setPointerCapture(event.pointerId)

    const x = event.clientX - el.getBoundingClientRect().left
    const y = event.clientY - el.getBoundingClientRect().top
    pointersRef.current.set(event.pointerId, { x, y })

    if (pointersRef.current.size === 2) {
      startPinch()
      return
    }

    const target = event.target as HTMLElement
    const handleEl = target.closest('[data-resize-handle]')
    const itemEl = target.closest('[data-item-id]')
    const now = Date.now()

    if (!readOnly && handleEl && selectedId) {
      const item = items.find((candidate) => candidate.id === selectedId)
      if (item) {
        gestureRef.current = {
          mode: 'resize',
          id: item.id,
          startX: x,
          startY: y,
          origW: item.w,
          origH: item.h,
        }
        return
      }
    }

    if (itemEl) {
      const id = itemEl.getAttribute('data-item-id') ?? ''
      const item = items.find((candidate) => candidate.id === id)
      if (item) {
        gestureRef.current = {
          mode: 'item',
          id,
          canDrag: !readOnly,
          startX: x,
          startY: y,
          origX: item.x,
          origY: item.y,
          downAt: now,
          moved: false,
        }
        return
      }
    }

    gestureRef.current = { mode: 'pan', lastX: x, lastY: y, downX: x, downY: y, downAt: now, moved: false }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current
    const gesture = gestureRef.current
    if (!el || !gesture || !pointersRef.current.has(event.pointerId)) return

    const x = event.clientX - el.getBoundingClientRect().left
    const y = event.clientY - el.getBoundingClientRect().top
    pointersRef.current.set(event.pointerId, { x, y })

    if (gesture.mode === 'pinch') {
      const points = [...pointersRef.current.values()]
      if (points.length < 2) return
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const midX = (points[0].x + points[1].x) / 2
      const midY = (points[0].y + points[1].y) / 2

      const nextZoom = clampSeating(gesture.prevZoom * (dist / gesture.prevDist), MIN_ZOOM, MAX_ZOOM)

      setView((prev) => {
        const wx = (midX - prev.panX) / prev.zoom
        const wy = (midY - prev.panY) / prev.zoom
        return { zoom: nextZoom, panX: midX - wx * nextZoom, panY: midY - wy * nextZoom }
      })

      gesture.prevDist = dist
      gesture.prevZoom = nextZoom
      return
    }

    if (gesture.mode === 'pan') {
      const dx = x - gesture.lastX
      const dy = y - gesture.lastY
      gesture.lastX = x
      gesture.lastY = y
      if (Math.abs(x - gesture.downX) > TAP_SLOP || Math.abs(y - gesture.downY) > TAP_SLOP) {
        gesture.moved = true
      }
      setView((prev) => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }))
      return
    }

    if (gesture.mode === 'item') {
      const dxWorld = (x - gesture.startX) / view.zoom / PXM
      const dyWorld = (y - gesture.startY) / view.zoom / PXM
      if (
        !gesture.moved &&
        (Math.abs(x - gesture.startX) > TAP_SLOP || Math.abs(y - gesture.startY) > TAP_SLOP)
      ) {
        gesture.moved = true
      }
      if (!gesture.moved || !gesture.canDrag) return
      const item = items.find((candidate) => candidate.id === gesture.id)
      if (!item) return
      const footprint = seatingFootprint(item.w, item.h, item.rotation)
      const minX = (footprint.w - item.w) / 2
      const minY = (footprint.h - item.h) / 2
      const nextX = clampSeating(
        snapSeating(gesture.origX + dxWorld),
        minX,
        Math.max(minX, SEATING_WORLD.w - (footprint.w + item.w) / 2),
      )
      const nextY = clampSeating(
        snapSeating(gesture.origY + dyWorld),
        minY,
        Math.max(minY, SEATING_WORLD.h - (footprint.h + item.h) / 2),
      )
      if (nextX !== item.x || nextY !== item.y) onMoveItem(gesture.id, nextX, nextY)
      return
    }

    if (gesture.mode === 'resize') {
      const dwWorld = (x - gesture.startX) / view.zoom / PXM
      const dhWorld = (y - gesture.startY) / view.zoom / PXM
      const item = items.find((candidate) => candidate.id === gesture.id)
      if (!item) return
      const spec = SEATING_KINDS[item.kind]
      const maxW = Math.max(
        spec.minSize.w,
        Math.min(spec.maxSize.w, seatingMaxSize(gesture.origW, gesture.origH, item.rotation, 'w')),
      )
      const maxH = Math.max(
        spec.minSize.h,
        Math.min(spec.maxSize.h, seatingMaxSize(gesture.origW, gesture.origH, item.rotation, 'h')),
      )
      const nextW = clampSeating(snapSeating(gesture.origW + dwWorld), spec.minSize.w, maxW)
      const nextH = clampSeating(snapSeating(gesture.origH + dhWorld), spec.minSize.h, maxH)
      const position = seatingKeepInside(item.x, item.y, nextW, nextH, item.rotation)
      if (
        nextW === item.w &&
        nextH === item.h &&
        position.x === item.x &&
        position.y === item.y
      ) {
        return
      }
      onResizeItem(gesture.id, nextW, nextH, position.x, position.y)
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    pointersRef.current.delete(event.pointerId)

    if (!gesture) {
      if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
        viewportRef.current.releasePointerCapture(event.pointerId)
      }
      return
    }

    if (gesture.mode === 'pinch') {
      const remaining = [...pointersRef.current.entries()]
      if (remaining.length === 1) {
        const [px, py] = [remaining[0][1].x, remaining[0][1].y]
        gestureRef.current = { mode: 'pan', lastX: px, lastY: py, downX: px, downY: py, downAt: Date.now(), moved: true }
      } else if (remaining.length === 0) {
        gestureRef.current = null
      }
      releaseCapture(event.pointerId)
      return
    }

    if (gesture.mode === 'pan' && !gesture.moved && Date.now() - gesture.downAt < TAP_MS) {
      onSelect(null)
    }
    if (gesture.mode === 'item' && !gesture.moved && Date.now() - gesture.downAt < TAP_MS) {
      onSelect(gesture.id)
    }

    gestureRef.current = null
    releaseCapture(event.pointerId)
  }

  const releaseCapture = (pointerId: number) => {
    const el = viewportRef.current
    if (el?.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId)
  }

  const selectedItem = items.find((item) => item.id === selectedId) ?? null

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full touch-none select-none overflow-hidden bg-ivory-deep/60"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: worldW,
          height: worldH,
          transform: `translate3d(${view.panX}px, ${view.panY}px, 0) scale(${view.zoom})`,
          willChange: 'transform',
        }}
      >
        <div className="seating-grid absolute inset-0 rounded-sm border-[1.5px] border-ink/50" />

        {Array.from({ length: Math.floor(SEATING_WORLD.w / 5) + 1 }, (_, index) => index * 5).map((meters) => (
          <span
            key={`x-${meters}`}
            className="absolute font-serif text-[11px] tracking-widest text-ink-faint"
            style={{ left: meters * PXM + 6, top: -18 }}
          >
            {meters}
          </span>
        ))}
        {Array.from({ length: Math.floor(SEATING_WORLD.h / 5) + 1 }, (_, index) => index * 5).map((meters) => (
          <span
            key={`y-${meters}`}
            className="absolute font-serif text-[11px] tracking-widest text-ink-faint"
            style={{ top: meters * PXM + 4, left: -20 }}
          >
            {meters}
          </span>
        ))}

        {items.map((item) => (
          <SeatingBlock
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            readOnly={readOnly}
            zoom={view.zoom}
            occupied={occupiedByTable.get(item.id)}
          />
        ))}
      </div>

      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          aria-label="Acercar"
          onClick={() => {
            const el = viewportRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            zoomAt(1.2, rect.width / 2, rect.height / 2)
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 bg-ivory/90 text-ink shadow-sm backdrop-blur transition-colors hover:bg-ivory-deep active:bg-ink active:text-ivory"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Alejar"
          onClick={() => {
            const el = viewportRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            zoomAt(1 / 1.2, rect.width / 2, rect.height / 2)
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 bg-ivory/90 text-ink shadow-sm backdrop-blur transition-colors hover:bg-ivory-deep active:bg-ink active:text-ivory"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Ajustar a la pantalla"
          onClick={fitView}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 bg-ivory/90 text-ink shadow-sm backdrop-blur transition-colors hover:bg-ivory-deep active:bg-ink active:text-ivory"
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>

      {selectedItem && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-ink/15 bg-ivory/95 px-4 py-1.5 font-serif text-[0.65rem] uppercase tracking-[0.2em] text-ink-soft shadow-sm backdrop-blur">
          {SEATING_KINDS[selectedItem.kind].label} · {formatDimensions(selectedItem.w, selectedItem.h)}
        </div>
      )}
    </div>
  )
}

function SeatingBlock({
  item,
  selected,
  readOnly,
  zoom,
  occupied,
}: {
  item: SeatingItem
  selected: boolean
  readOnly: boolean
  zoom: number
  occupied?: number
}) {
  const spec = SEATING_KINDS[item.kind]

  return (
    <div
      data-item-id={item.id}
      className={`absolute ${selected ? 'z-20' : 'z-10'} ${readOnly ? '' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        left: item.x * PXM,
        top: item.y * PXM,
        width: item.w * PXM,
        height: item.h * PXM,
        transform: `rotate(${item.rotation}deg)`,
        transformOrigin: 'center',
      }}
    >
      {spec.shape === 'round' && <RoundTableVisual item={item} />}
      {spec.shape === 'hatch' && <div className="seating-hatch absolute inset-0 rounded-[3px]" />}
      {spec.shape === 'rect' && <RectVisual item={item} />}

      {(item.label || item.kind.startsWith('table')) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center overflow-visible">
          {item.label && (
            <span className="max-w-[140%] truncate px-1 font-serif text-[10px] uppercase tracking-[0.14em] text-ink">
              {item.label}
            </span>
          )}
          {item.seats != null && (
            <span className="mt-0.5 font-serif text-[10px] tabular-nums text-brass">
              {occupied ?? 0}/{item.seats}
            </span>
          )}
        </div>
      )}

      {selected && (
        <>
          <div className="pointer-events-none absolute -inset-[3px] rounded-[6px] outline outline-2 outline-brass" />
          {!readOnly && (
            <div
              data-resize-handle
              aria-hidden="true"
              className="absolute flex items-center justify-center rounded-full border-[1.5px] border-brass bg-ivory shadow-md"
              style={{
                width: 26 / zoom,
                height: 26 / zoom,
                right: -13 / zoom,
                bottom: -13 / zoom,
              }}
            >
              <span className="block rounded-full bg-brass" style={{ width: 8 / zoom, height: 8 / zoom }} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RoundTableVisual({ item }: { item: SeatingItem }) {
  const seats = item.seats ?? 0
  const radiusX = (item.w * PXM) / 2
  const radiusY = (item.h * PXM) / 2
  const chairSize = PXM * 0.42

  return (
    <>
      <div className="absolute inset-0 rounded-full border-[1.5px] border-ink bg-ivory-deep/80" />
      {Array.from({ length: seats }, (_, index) => {
        const angle = (index / seats) * Math.PI * 2 - Math.PI / 2
        const chairX = radiusX + Math.cos(angle) * (radiusX + chairSize * 0.62) - chairSize / 2
        const chairY = radiusY + Math.sin(angle) * (radiusY + chairSize * 0.62) - chairSize / 2
        return (
          <div
            key={index}
            className="absolute rounded-[2px] bg-ink/70"
            style={{ left: chairX, top: chairY, width: chairSize, height: chairSize }}
          />
        )
      })}
    </>
  )
}

function RectVisual({ item }: { item: SeatingItem }) {
  const width = item.w * PXM
  const height = item.h * PXM

  if (item.kind === 'chair') {
    return <div className="absolute inset-0 rounded-[3px] bg-ink/70" />
  }

  if (item.kind === 'table_rect') {
    const seats = item.seats ?? 0
    const topCount = Math.ceil(seats / 2)
    const bottomCount = seats - topCount
    const chairSize = PXM * 0.42

    const row = (count: number, side: 'top' | 'bottom') =>
      Array.from({ length: count }, (_, index) => {
        const spacing = count > 1 ? (width - chairSize) / (count - 1) : 0
        return (
          <div
            key={`${side}-${index}`}
            className="absolute rounded-[2px] bg-ink/70"
            style={{
              left: count > 1 ? index * spacing : (width - chairSize) / 2,
              top:
                side === 'top'
                  ? -chairSize * 1.35
                  : height + chairSize * 0.35,
              width: chairSize,
              height: chairSize,
            }}
          />
        )
      })

    return (
      <>
        <div className="absolute inset-0 rounded-[3px] border-[1.5px] border-ink bg-ivory-deep/80" />
        {row(topCount, 'top')}
        {row(bottomCount, 'bottom')}
      </>
    )
  }

  if (item.kind === 'dance_floor') {
    return <div className="absolute inset-0 rounded-[3px] border-[1.5px] border-dashed border-brass/70 bg-brass/5" />
  }

  if (item.kind === 'stage') {
    return <div className="absolute inset-0 rounded-[3px] border-[1.5px] border-ink bg-ink/10" />
  }

  return <div className="absolute inset-0 rounded-[3px] border-[1.5px] border-ink/70 bg-ivory-deep/60" />
}
