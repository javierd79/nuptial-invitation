export type SeatingKind =
  | 'wall'
  | 'table_round'
  | 'table_rect'
  | 'chair'
  | 'dance_floor'
  | 'stage'
  | 'bar'
  | 'furniture'

export type SeatingShape = 'rect' | 'round' | 'hatch'

export interface SeatingItem {
  id: string
  kind: SeatingKind
  x: number
  y: number
  w: number
  h: number
  rotation: number
  label: string
  seats: number | null
  guest_ids: string[]
}

export interface SeatingGuest {
  id: string
  full_name: string
  plus_ones: number
  is_attending: boolean | null
  is_courtesy: boolean
}

export interface SeatingKindSpec {
  label: string
  group: 'Estructura' | 'Mesas' | 'Mobiliario'
  shape: SeatingShape
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
  maxSize: { w: number; h: number }
  seats?: { def: number; min: number; max: number }
}

export const SEATING_WORLD = { w: 30, h: 20 }

export const SEATING_GRID = 0.5

export const SEATING_SNAP = 0.25

export const SEATING_ROTATION_STEP = 45

export const SEATING_KINDS: Record<SeatingKind, SeatingKindSpec> = {
  wall: {
    label: 'Muro',
    group: 'Estructura',
    shape: 'hatch',
    defaultSize: { w: 4, h: 0.25 },
    minSize: { w: 0.5, h: 0.25 },
    maxSize: { w: 30, h: 3 },
  },
  chair: {
    label: 'Silla',
    group: 'Mesas',
    shape: 'rect',
    defaultSize: { w: 0.5, h: 0.5 },
    minSize: { w: 0.5, h: 0.5 },
    maxSize: { w: 0.5, h: 0.5 },
  },
  table_round: {
    label: 'Mesa redonda',
    group: 'Mesas',
    shape: 'round',
    defaultSize: { w: 1.8, h: 1.8 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 3, h: 3 },
    seats: { def: 8, min: 4, max: 12 },
  },
  table_rect: {
    label: 'Mesa rectangular',
    group: 'Mesas',
    shape: 'rect',
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 1, h: 0.6 },
    maxSize: { w: 4, h: 1.5 },
    seats: { def: 8, min: 4, max: 12 },
  },
  dance_floor: {
    label: 'Pista de baile',
    group: 'Mobiliario',
    shape: 'rect',
    defaultSize: { w: 5, h: 5 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
  },
  stage: {
    label: 'Escenario',
    group: 'Mobiliario',
    shape: 'rect',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 2, h: 1 },
    maxSize: { w: 10, h: 6 },
  },
  bar: {
    label: 'Barra',
    group: 'Mobiliario',
    shape: 'rect',
    defaultSize: { w: 3, h: 1 },
    minSize: { w: 1, h: 0.6 },
    maxSize: { w: 8, h: 3 },
  },
  furniture: {
    label: 'Mueble',
    group: 'Mobiliario',
    shape: 'rect',
    defaultSize: { w: 1.5, h: 0.8 },
    minSize: { w: 0.5, h: 0.5 },
    maxSize: { w: 8, h: 8 },
  },
}

export const SEATING_PALETTE: SeatingKind[] = [
  'wall',
  'table_round',
  'table_rect',
  'chair',
  'dance_floor',
  'stage',
  'bar',
  'furniture',
]

export function snapSeating(value: number): number {
  return Math.round(value / SEATING_SNAP) * SEATING_SNAP
}

export function clampSeating(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Axis-aligned bounding box a block occupies on screen once rotated. */
export function seatingFootprint(
  w: number,
  h: number,
  rotation: number,
): { w: number; h: number } {
  const radians = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  return { w: w * cos + h * sin, h: w * sin + h * cos }
}

/** Largest local width/height a block may take so its rotated footprint stays inside the world. */
export function seatingMaxSize(
  w: number,
  h: number,
  rotation: number,
  axis: 'w' | 'h',
): number {
  const radians = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))

  if (axis === 'w') {
    const byWorldW = cos < 1e-6 ? Infinity : (SEATING_WORLD.w - h * sin) / cos
    const byWorldH = sin < 1e-6 ? Infinity : (SEATING_WORLD.h - h * cos) / sin
    return Math.max(0, Math.min(byWorldW, byWorldH))
  }

  const byWorldW = sin < 1e-6 ? Infinity : (SEATING_WORLD.w - w * sin) / sin
  const byWorldH = cos < 1e-6 ? Infinity : (SEATING_WORLD.h - w * cos) / cos
  return Math.max(0, Math.min(byWorldW, byWorldH))
}

/**
 * Position that keeps a resized block's rotated bounding box inside the world,
 * preserving its center as much as the limits allow.
 */
export function seatingKeepInside(
  x: number,
  y: number,
  nextW: number,
  nextH: number,
  rotation: number,
): { x: number; y: number } {
  const footprint = seatingFootprint(nextW, nextH, rotation)
  const halfFootprintW = footprint.w / 2
  const halfFootprintH = footprint.h / 2

  let cx = clampSeating(x + nextW / 2, halfFootprintW, Math.max(halfFootprintW, SEATING_WORLD.w - halfFootprintW))
  let cy = clampSeating(y + nextH / 2, halfFootprintH, Math.max(halfFootprintH, SEATING_WORLD.h - halfFootprintH))

  cx = clampSeating(snapSeating(cx - nextW / 2) + nextW / 2, halfFootprintW, Math.max(halfFootprintW, SEATING_WORLD.w - halfFootprintW))
  cy = clampSeating(snapSeating(cy - nextH / 2) + nextH / 2, halfFootprintH, Math.max(halfFootprintH, SEATING_WORLD.h - halfFootprintH))

  return { x: cx - nextW / 2, y: cy - nextH / 2 }
}

/** Seats a guest occupies including their plus-ones. */
export function seatUnits(guest: Pick<SeatingGuest, 'plus_ones'>): number {
  return 1 + (guest.plus_ones ?? 0)
}

export function seatsUsed(item: SeatingItem, guestsById: Map<string, SeatingGuest>): number {
  return item.guest_ids.reduce((sum, id) => sum + seatUnitsOf(id, guestsById), 0)
}

function seatUnitsOf(id: string, guestsById: Map<string, SeatingGuest>): number {
  const guest = guestsById.get(id)
  return guest ? seatUnits(guest) : 1
}

const meterFormatter = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })

export function formatMeters(value: number): string {
  return `${meterFormatter.format(Number(value.toFixed(2)))} m`
}

export function formatDimensions(w: number, h: number): string {
  return `${meterFormatter.format(Number(w.toFixed(2)))} × ${meterFormatter.format(Number(h.toFixed(2)))} m`
}
