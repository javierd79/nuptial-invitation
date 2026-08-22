'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { Check, LayoutDashboard, LogOut, Minus, Plus, RotateCcw, RotateCw, Search, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getUserWithRole, roleHome, type AuthUser } from '@/lib/auth'
import {
  SEATING_KINDS,
  SEATING_PALETTE,
  SEATING_ROTATION_STEP,
  SEATING_SNAP,
  SEATING_WORLD,
  clampSeating,
  formatDimensions,
  formatMeters,
  seatUnits,
  seatsUsed,
  seatingKeepInside,
  seatingMaxSize,
  snapSeating,
  type SeatingGuest,
  type SeatingItem,
  type SeatingKind,
} from '@/lib/seating'
import { useSeating } from '@/lib/use-seating'
import FloorCanvas from '@/components/admin/seating/FloorCanvas'
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog'
import ChatButton from '@/components/ChatButton'

export default function SeatingPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [guests, setGuests] = useState<SeatingGuest[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [guestSearch, setGuestSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const readOnly = user?.role !== 'ADMIN'

  const { items, loading: itemsLoading, saveState, addItem, updateItem, deleteItem } = useSeating(
    Boolean(user),
  )

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/admin/login')
        return
      }

      const authUser = await getUserWithRole(supabase)
      if (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'PROTOCOL')) {
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }
      if (!mounted) return
      setUser(authUser)

      const { data } = await supabase
        .from('guests')
        .select('id, full_name, plus_ones, is_attending, is_courtesy')
        .order('full_name', { ascending: true })
      if (!mounted) return
      setGuests((data ?? []) as SeatingGuest[])

      setLoading(false)
    }

    void init()
    return () => {
      mounted = false
    }
  }, [router])

  const guestsById = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests])

  const occupiedByTable = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      if (item.seats == null) continue
      map.set(item.id, seatsUsed(item, guestsById))
    }
    return map
  }, [items, guestsById])

  const assignedIds = useMemo(() => new Set(items.flatMap((item) => item.guest_ids)), [items])

  const selectedItem = items.find((item) => item.id === selectedId) ?? null

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const addFromPalette = async (kind: SeatingKind) => {
    setPaletteOpen(false)
    if (!user || user.role !== 'ADMIN') return
    const spec = SEATING_KINDS[kind]
    const offset = items.length % 6
    const position = {
      x: snapSeating(SEATING_WORLD.w / 2 - spec.defaultSize.w / 2 + (offset % 3) * 0.75),
      y: snapSeating(SEATING_WORLD.h / 2 - spec.defaultSize.h / 2 + Math.floor(offset / 3) * 1),
    }
    const created = await addItem(kind, position)
    if (created) setSelectedId(created.id)
  }

  const toggleGuest = (item: SeatingItem, guestId: string) => {
    const guest = guestsById.get(guestId)
    if (!guest) return
    const has = item.guest_ids.includes(guestId)
    if (!has && item.seats != null) {
      const used = seatsUsed(item, guestsById)
      if (used + seatUnits(guest) > item.seats) return
    }
    updateItem(item.id, {
      guest_ids: has ? item.guest_ids.filter((id) => id !== guestId) : [...item.guest_ids, guestId],
    })
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory text-ink">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-px animate-pulse bg-ink/20" />
          <p className="font-serif text-sm italic text-ink-soft">Abriendo plano del salón…</p>
        </div>
      </div>
    )
  }

  const saveLabel =
    saveState === 'saving' ? 'Guardando…' : saveState === 'error' ? 'Error al guardar' : 'Guardado ✓'

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-[100dvh] flex-col bg-ivory text-ink">
        <header className="border-b border-ink/10 bg-ivory/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => router.push(roleHome(user.role))}
              aria-label="Volver al panel"
              className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5"
            >
              <LayoutDashboard className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-xl font-light tracking-[-0.01em]">Salón</h1>
              <p
                className={`font-serif text-[0.6rem] uppercase tracking-[0.25em] ${
                  saveState === 'error' ? 'text-red-700/80' : saveState === 'saving' ? 'text-ink-faint animate-pulse' : 'text-brass'
                }`}
              >
                {readOnly ? 'Solo lectura' : saveLabel}
              </p>
            </div>
            {user.role && (
              <span className="shrink-0 border border-brass/30 bg-brass/10 px-2 py-1 font-serif text-[0.55rem] uppercase tracking-[0.25em] text-brass">
                {user.role}
              </span>
            )}
            <ChatButton user={user} />
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-ivory"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <p className="border-b border-ink/10 bg-ivory-deep/40 px-4 py-2 text-center font-serif text-[0.65rem] italic text-ink-faint">
          {readOnly
            ? 'Toca un bloque para ver su detalle.'
            : 'Arrastra los bloques · Pellizca o usa la rueda para zoom · Toca una mesa para sentar invitados.'}
        </p>

        <main className="relative min-h-0 flex-1">
          {itemsLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="font-serif text-sm italic text-ink-soft">Cargando plano…</p>
            </div>
          ) : (
            <FloorCanvas
              items={items}
              selectedId={selectedId}
              readOnly={readOnly}
              occupiedByTable={occupiedByTable}
              onSelect={setSelectedId}
              onMoveItem={(id, x, y) => updateItem(id, { x, y })}
              onResizeItem={(id, w, h, x, y) => updateItem(id, { w, h, x, y })}
            />
          )}
        </main>

        <AnimatePresence>
          {!readOnly && !paletteOpen && (
            <motion.button
              key="fab-anadir"
              type="button"
              onClick={() => setPaletteOpen(true)}
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.9 }}
              whileTap={{ scale: 0.94 }}
              className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-brass bg-brass px-6 py-3 font-serif text-xs uppercase tracking-[0.25em] text-ivory shadow-lg shadow-ink/15"
            >
              <Plus className="h-4 w-4" />
              Añadir bloque
            </motion.button>
          )}
        </AnimatePresence>

        <Dialog open={paletteOpen} onOpenChange={(open) => !open && setPaletteOpen(false)}>
          <SheetContent onCloseRequest={() => setPaletteOpen(false)} showCloseButton={false} className="bg-ivory text-ink ring-ink/10">
            <DialogTitle className="font-serif text-xl font-light tracking-[-0.01em]">Añadir bloque</DialogTitle>
            {[...new Set(SEATING_PALETTE.map((kind) => SEATING_KINDS[kind].group))].map((group) => (
              <section key={group}>
                <p className="font-serif text-[0.6rem] uppercase tracking-[0.25em] text-ink-faint">{group}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {SEATING_PALETTE.filter((kind) => SEATING_KINDS[kind].group === group).map((kind) => (
                    <PaletteButton key={kind} kind={kind} onPick={() => void addFromPalette(kind)} />
                  ))}
                </div>
              </section>
            ))}
          </SheetContent>
        </Dialog>

        <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedId(null)}>
          {selectedItem && (
            <SheetContent
              key={selectedItem.id}
              onCloseRequest={() => setSelectedId(null)}
              showCloseButton={false}
              className="bg-ivory text-ink ring-ink/10"
            >
              <InspectorBody
                item={selectedItem}
                readOnly={readOnly}
                guestsById={guestsById}
                assignedIds={assignedIds}
                guestSearch={guestSearch}
                confirmDelete={confirmDelete}
                onGuestSearch={setGuestSearch}
                onToggleGuest={(guestId) => toggleGuest(selectedItem, guestId)}
                onPatch={(patch) => updateItem(selectedItem.id, patch)}
                onDelete={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true)
                    return
                  }
                  void deleteItem(selectedItem.id)
                  setSelectedId(null)
                  setConfirmDelete(false)
                }}
                onClose={() => {
                  setSelectedId(null)
                  setConfirmDelete(false)
                }}
              />
            </SheetContent>
          )}
        </Dialog>
      </div>
    </MotionConfig>
  )
}

function PaletteButton({ kind, onPick }: { kind: SeatingKind; onPick: () => void }) {
  const spec = SEATING_KINDS[kind]
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex items-center gap-3 rounded-xl border border-ink/15 px-3 py-2.5 text-left transition-colors hover:border-brass/50 hover:bg-brass/5 active:bg-brass/10"
    >
      <span className="relative inline-block h-7 w-7 shrink-0">
        {spec.shape === 'round' && <span className="absolute inset-0 rounded-full border-[1.5px] border-ink bg-ivory-deep/70" />}
        {spec.shape === 'hatch' && <span className="seating-hatch absolute inset-y-2.5 inset-x-0 rounded-[2px]" />}
        {spec.shape === 'rect' && kind !== 'chair' && (
          <span className={`absolute inset-0 rounded-[3px] border-[1.5px] ${kind === 'dance_floor' ? 'border-dashed border-brass/70 bg-brass/5' : 'border-ink bg-ivory-deep/60'}`} />
        )}
        {kind === 'chair' && <span className="absolute inset-2 rounded-[2px] bg-ink/70" />}
      </span>
      <span className="min-w-0 truncate font-serif text-sm">{spec.label}</span>
    </button>
  )
}

function InspectorStepper({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-full border border-ink/15 px-4 py-1.5">
      <span className="font-serif text-xs uppercase tracking-[0.2em] text-ink-faint">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Reducir ${label}`}
          disabled={value <= min}
          onClick={() => onChange(clampSeating(snapSeating(value - step), min, max))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 text-ink transition-colors hover:bg-ink hover:text-ivory disabled:pointer-events-none disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-16 text-center font-serif text-sm tabular-nums">{display}</span>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          disabled={value >= max}
          onClick={() => onChange(clampSeating(snapSeating(value + step), min, max))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 text-ink transition-colors hover:bg-ink hover:text-ivory disabled:pointer-events-none disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  )
}

function InspectorBody({
  item,
  readOnly,
  guestsById,
  assignedIds,
  guestSearch,
  confirmDelete,
  onGuestSearch,
  onToggleGuest,
  onPatch,
  onDelete,
  onClose,
}: {
  item: SeatingItem
  readOnly: boolean
  guestsById: Map<string, SeatingGuest>
  assignedIds: Set<string>
  guestSearch: string
  confirmDelete: boolean
  onGuestSearch: (value: string) => void
  onToggleGuest: (guestId: string) => void
  onPatch: (patch: Partial<SeatingItem>) => void
  onDelete: () => void
  onClose: () => void
}) {
  const spec = SEATING_KINDS[item.kind]
  const used = seatsUsed(item, guestsById)
  const canRotate = item.kind !== 'table_round' && item.kind !== 'chair'
  const fixedSize = item.kind === 'chair'
  const isRound = spec.shape === 'round'

  const sizeStep = (axis: 'w' | 'h') => (next: number) => {
    const nextW = axis === 'w' ? next : item.w
    const nextH = axis === 'h' ? next : item.h
    const position = seatingKeepInside(item.x, item.y, nextW, nextH, item.rotation)
    onPatch({ [axis]: next, x: position.x, y: position.y })
  }

  const rotateBy = (delta: number) => {
    const rotation = (item.rotation + delta + 360) % 360
    const position = seatingKeepInside(item.x, item.y, item.w, item.h, rotation)
    onPatch({ rotation, x: position.x, y: position.y })
  }

  const query = guestSearch.trim().toLowerCase()
  const assignableGuests = [...guestsById.values()]
    .filter((guest) => !assignedIds.has(guest.id) || item.guest_ids.includes(guest.id))
    .filter((guest) => !query || guest.full_name.toLowerCase().includes(query))

  return (
    <>
      <DialogTitle className="font-serif text-xl font-light tracking-[-0.01em]">
        {item.label || spec.label}
      </DialogTitle>
      <p className="font-serif text-xs italic text-ink-soft">
        {spec.label} · {formatDimensions(item.w, item.h)}
      </p>

      <div className="flex flex-col gap-3 overflow-y-auto pb-1">
        {!readOnly && (
          <label className="block">
            <span className="font-serif text-[0.6rem] uppercase tracking-[0.25em] text-ink-faint">Etiqueta</span>
            <input
              type="text"
              value={item.label}
              onChange={(event) => onPatch({ label: event.target.value.slice(0, 40) })}
              placeholder={spec.label}
              autoComplete="off"
              className="mt-2 w-full border-b border-ink/20 bg-transparent pb-2 font-serif text-base font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none"
            />
          </label>
        )}

        {canRotate && !readOnly && (
          <div className="flex items-center justify-between rounded-full border border-ink/15 px-4 py-1.5">
            <span className="font-serif text-xs uppercase tracking-[0.2em] text-ink-faint">Rotación</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Rotar a la izquierda"
                onClick={() => rotateBy(-SEATING_ROTATION_STEP)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 text-ink transition-colors hover:bg-ink hover:text-ivory"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-12 text-center font-serif text-sm tabular-nums">{item.rotation}°</span>
              <button
                type="button"
                aria-label="Rotar a la derecha"
                onClick={() => rotateBy(SEATING_ROTATION_STEP)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 text-ink transition-colors hover:bg-ink hover:text-ivory"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        )}

        {!fixedSize && !readOnly && (
          <>
            {isRound ? (
              <InspectorStepper
                label="Diámetro"
                value={item.w}
                display={formatMeters(item.w)}
                min={spec.minSize.w}
                max={Math.min(spec.maxSize.w, SEATING_WORLD.w)}
                step={SEATING_SNAP}
                onChange={(next) => onPatch({ w: next, h: next })}
              />
            ) : (
              <>
                <InspectorStepper
                  label="Ancho"
                  value={item.w}
                  display={formatMeters(item.w)}
                  min={spec.minSize.w}
                  max={Math.max(spec.minSize.w, Math.min(spec.maxSize.w, seatingMaxSize(item.w, item.h, item.rotation, 'w')))}
                  step={SEATING_SNAP}
                  onChange={sizeStep('w')}
                />
                <InspectorStepper
                  label="Alto"
                  value={item.h}
                  display={formatMeters(item.h)}
                  min={spec.minSize.h}
                  max={Math.max(spec.minSize.h, Math.min(spec.maxSize.h, seatingMaxSize(item.w, item.h, item.rotation, 'h')))}
                  step={SEATING_SNAP}
                  onChange={sizeStep('h')}
                />
              </>
            )}
          </>
        )}

        {item.seats != null && (
          <>
            {!readOnly && (
              <InspectorStepper
                label="Sillas"
                value={item.seats}
                display={`${item.seats}`}
                min={spec.seats?.min ?? 4}
                max={spec.seats?.max ?? 12}
                step={1}
                onChange={(next) => onPatch({ seats: next })}
              />
            )}
            <div>
              <p className="flex items-baseline justify-between font-serif text-[0.6rem] uppercase tracking-[0.25em] text-ink-faint">
                Invitados
                <span className={`tabular-nums ${used > item.seats ? 'text-red-700/80' : 'text-brass'}`}>
                  {used}/{item.seats} sillas
                </span>
              </p>

              {item.guest_ids.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {item.guest_ids.map((guestId) => {
                    const guest = guestsById.get(guestId)
                    return (
                      <li
                        key={guestId}
                        className="flex items-center justify-between gap-2 rounded-full border border-ink/15 bg-ivory-deep/60 px-3 py-1.5"
                      >
                        <span className="min-w-0 truncate font-serif text-sm">
                          {guest?.full_name ?? 'Invitado eliminado'}
                          {guest && guest.plus_ones > 0 && (
                            <span className="ml-1.5 font-serif text-xs text-ink-faint">+{guest.plus_ones}</span>
                          )}
                        </span>
                        {!readOnly && guest && (
                          <button
                            type="button"
                            aria-label={`Quitar a ${guest.full_name}`}
                            onClick={() => onToggleGuest(guestId)}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-ink/5 hover:text-red-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              {!readOnly && (
                <>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
                    <input
                      type="search"
                      value={guestSearch}
                      onChange={(event) => onGuestSearch(event.target.value)}
                      placeholder="Buscar invitado…"
                      className="w-full border-b border-ink/20 bg-transparent py-2 pl-7 pr-8 font-serif text-base font-light placeholder:text-ink/25 focus:border-brass focus:outline-none"
                    />
                    {guestSearch && (
                      <button
                        type="button"
                        onClick={() => onGuestSearch('')}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-ink/40 transition-colors hover:text-ink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {assignableGuests.length === 0 ? (
                    <p className="mt-2 font-serif text-xs italic text-ink-faint">Sin resultados</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {assignableGuests.map((guest) => {
                        const inTable = item.guest_ids.includes(guest.id)
                        const full =
                          !inTable && used + seatUnits(guest) > item.seats!
                        return (
                          <li key={guest.id}>
                            <button
                              type="button"
                              onClick={() => onToggleGuest(guest.id)}
                              disabled={full}
                              className={`flex w-full items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-left transition-colors ${
                                inTable
                                  ? 'border-brass/50 bg-brass/10'
                                  : full
                                    ? 'border-ink/10 opacity-40'
                                    : 'border-ink/15 hover:border-brass/40 hover:bg-brass/5'
                              }`}
                            >
                              <span className="min-w-0 truncate font-serif text-sm">
                                {guest.full_name}
                                {guest.plus_ones > 0 && (
                                  <span className="ml-1.5 font-serif text-xs text-ink-faint">+{guest.plus_ones}</span>
                                )}
                                {guest.is_courtesy && (
                                  <span className="ml-1.5 font-serif text-[0.55rem] uppercase tracking-[0.15em] text-ink-faint">
                                    cortesía
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 font-serif text-[0.65rem] tabular-nums text-ink-faint">
                                {seatUnits(guest)} silla{seatUnits(guest) > 1 ? 's' : ''}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {!readOnly && (
          <button
            type="button"
            onClick={onDelete}
            className={`mt-1 w-full rounded-full border py-2.5 font-serif text-[0.65rem] uppercase tracking-[0.25em] transition-colors ${
              confirmDelete
                ? 'border-red-700 bg-red-700 text-ivory'
                : 'border-red-700/30 text-red-700/70 hover:border-red-700/60 hover:text-red-700'
            }`}
          >
            {confirmDelete ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Check className="h-3.5 w-3.5" />
                ¿Eliminar bloque?
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar bloque
              </span>
            )}
          </button>
        )}
      </div>
    </>
  )
}
