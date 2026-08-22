'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { getUserWithRole, type AuthUser } from '@/lib/auth'
import { Bell, BellRing, Check, ChevronUp, LogOut, Minus, Plus, Search, Users, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog'
import { SPRING_SOFT, Tappable } from '@/components/motion'
import { useGuestChangeNotifications } from '@/lib/use-guest-change-notifications'
import ToastStack from '@/components/ToastStack'
import ChatButton from '@/components/ChatButton'

interface Guest {
  id: string
  full_name: string
  email: string
  plus_ones: number
  is_godparent: boolean
  is_attending: boolean | null
  is_courtesy: boolean
  checked_in_at: string | null
  arrival_mode: string | null
  companions_arrived: number | null
  attended_ceremony: boolean
  attended_brindis: boolean
  protocol_notes: string | null
}

type RealtimeStatus = 'connecting' | 'live' | 'offline'

type ArrivalMode = 'alone' | 'with_companion' | 'companion_only'

const ARRIVAL_MODES: { value: ArrivalMode; label: string }[] = [
  { value: 'alone', label: 'Solo' },
  { value: 'with_companion', label: 'Con acompañante' },
  { value: 'companion_only', label: 'Solo acompañante' },
]

const formatArrival = (iso: string) =>
  new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const statusFor = (guest: Guest) => {
  if (guest.is_courtesy) {
    return { label: 'Cortesía', className: 'border-ink/15 bg-ink/5 text-ink-soft' }
  }
  if (guest.is_attending === true) {
    return { label: 'Confirmado', className: 'border-brass/30 bg-brass/10 text-brass' }
  }
  if (guest.is_attending === false) {
    return { label: 'Rechazó', className: 'border-red-700/25 bg-red-700/10 text-red-700/80' }
  }
  return { label: 'Pendiente', className: 'border-ink/10 bg-ink/5 text-ink-soft' }
}

export default function ProtocolPage() {
  const router = useRouter()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const [search, setSearch] = useState('')
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({})
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('rsvp')
  const [sheetOpen, setSheetOpen] = useState(false)

  const { toasts, dismissToast, permission, requestPermission } = useGuestChangeNotifications({
    guests,
    role: user?.role ?? null,
  })

  const loadGuests = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setGuests(data as Guest[])
    }
  }, [])

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

      const user = await getUserWithRole(supabase)

      if (!user) {
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }

      if (!mounted) return
      setUser(user)

      await loadGuests()
      if (!mounted) return
      setLoading(false)

      const channel = supabase
        .channel('protocol-guests-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'guests' },
          () => {
            loadGuests()
          },
        )
        .subscribe((status) => {
          if (!mounted) return
          if (status === 'SUBSCRIBED') setRealtimeStatus('live')
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setRealtimeStatus('offline')
          }
        })

      return [channel]
    }

    const channelsPromise = init()

    return () => {
      mounted = false
      channelsPromise.then((channels) => {
        channels?.forEach((channel) => supabase.removeChannel(channel))
      })
    }
  }, [loadGuests, router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const patchLocal = (id: string, patch: Partial<Guest>) =>
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))

  const setAttendance = async (guest: Guest, attending: boolean) => {
    const next = guest.is_attending === attending ? null : attending
    patchLocal(guest.id, { is_attending: next })

    const supabase = createClient()
    const { error } = await supabase.from('guests').update({ is_attending: next }).eq('id', guest.id)

    if (error) {
      console.error('Error updating attendance:', error)
      loadGuests()
    }
  }

  const markArrival = async (guest: Guest) => {
    if (guest.checked_in_at) return

    const now = new Date().toISOString()
    const patch: Partial<Guest> = { checked_in_at: now }
    if (guest.plus_ones === 0) {
      patch.arrival_mode = 'alone'
      patch.companions_arrived = 0
    }
    patchLocal(guest.id, patch)

    const supabase = createClient()
    const { error } = await supabase.from('guests').update(patch).eq('id', guest.id)

    if (error) {
      console.error('Error checking in guest:', error)
      loadGuests()
    }
  }

  const undoArrival = async (guest: Guest) => {
    patchLocal(guest.id, {
      checked_in_at: null,
      arrival_mode: null,
      companions_arrived: 0,
      attended_ceremony: false,
      attended_brindis: false,
    })

    const supabase = createClient()
    const { error } = await supabase
      .from('guests')
      .update({
        checked_in_at: null,
        arrival_mode: null,
        companions_arrived: 0,
        attended_ceremony: false,
        attended_brindis: false,
      })
      .eq('id', guest.id)

    if (error) {
      console.error('Error undoing check-in:', error)
      loadGuests()
    }
  }

  const setArrivalMode = async (guest: Guest, mode: ArrivalMode) => {
    if (!guest.checked_in_at) return

    const next = guest.arrival_mode === mode ? null : mode
    const patch: Partial<Guest> =
      next === 'with_companion'
        ? { arrival_mode: next, companions_arrived: 1 }
        : { arrival_mode: next, companions_arrived: 0 }
    patchLocal(guest.id, patch)

    const supabase = createClient()
    const { error } = await supabase
      .from('guests')
      .update({ arrival_mode: patch.arrival_mode, companions_arrived: patch.companions_arrived })
      .eq('id', guest.id)

    if (error) {
      console.error('Error updating arrival mode:', error)
      loadGuests()
    }
  }

  const adjustCompanionsArrived = async (guest: Guest, delta: number) => {
    if (!guest.checked_in_at || guest.arrival_mode !== 'with_companion') return

    const base = guest.companions_arrived ?? 0
    const next = Math.min(guest.plus_ones, Math.max(1, base + delta))
    if (next === base) return

    patchLocal(guest.id, { companions_arrived: next })

    const supabase = createClient()
    const { error } = await supabase
      .from('guests')
      .update({ companions_arrived: next })
      .eq('id', guest.id)

    if (error) {
      console.error('Error updating companions arrived:', error)
      loadGuests()
    }
  }

  const togglePart = async (guest: Guest, field: 'attended_ceremony' | 'attended_brindis') => {
    const next = !guest[field]
    const patch: Partial<Guest> =
      field === 'attended_ceremony' ? { attended_ceremony: next } : { attended_brindis: next }
    patchLocal(guest.id, patch)

    const supabase = createClient()
    const { error } = await supabase.from('guests').update(patch).eq('id', guest.id)

    if (error) {
      console.error('Error updating attendance part:', error)
      loadGuests()
    }
  }

  const noteDraftFor = (guest: Guest) => notesDrafts[guest.id] ?? guest.protocol_notes ?? ''

  const noteDirtyFor = (guest: Guest) =>
    noteDraftFor(guest) !== (guest.protocol_notes ?? '')

  const saveNotes = async (guest: Guest) => {
    const draft = noteDraftFor(guest).trim()
    patchLocal(guest.id, { protocol_notes: draft || null })
    setNotesDrafts((prev) => {
      const next = { ...prev }
      delete next[guest.id]
      return next
    })

    const supabase = createClient()
    const { error } = await supabase
      .from('guests')
      .update({ protocol_notes: draft || null })
      .eq('id', guest.id)

    if (error) {
      console.error('Error saving protocol notes:', error)
      loadGuests()
      return
    }

    setSavedNoteId(guest.id)
    setTimeout(() => setSavedNoteId(null), 2000)
  }

  const stats = useMemo(
    () => ({
      confirmed: guests.filter((g) => g.is_attending === true).length,
      pending: guests.filter((g) => g.is_attending === null && !g.is_courtesy).length,
      declined: guests.filter((g) => g.is_attending === false).length,
      arrived: guests.filter((g) => g.checked_in_at).length,
      ceremony: guests.filter((g) => g.attended_ceremony).length,
      brindis: guests.filter((g) => g.attended_brindis).length,
      alone: guests.filter((g) => g.arrival_mode === 'alone').length,
      withCompanion: guests.filter((g) => g.arrival_mode === 'with_companion').length,
      companionOnly: guests.filter((g) => g.arrival_mode === 'companion_only').length,
    }),
    [guests],
  )

  const filteredGuests = guests.filter((guest) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      guest.full_name.toLowerCase().includes(query) ||
      guest.email.toLowerCase().includes(query)
    )
  })

  const checkinGuests = useMemo(() => {
    const list = [...filteredGuests]
    return list.sort((a, b) => {
      if (a.checked_in_at && b.checked_in_at) {
        return a.checked_in_at < b.checked_in_at ? 1 : -1
      }
      if (a.checked_in_at) return 1
      if (b.checked_in_at) return -1
      return 0
    })
  }, [filteredGuests])

  const arrivedGuests = useMemo(
    () =>
      guests
        .filter((g) => g.checked_in_at)
        .sort((a, b) => (a.checked_in_at! < b.checked_in_at! ? 1 : -1)),
    [guests],
  )

  const cardClasses = 'rounded-2xl border border-ink/10 bg-ivory-deep/40 p-4'
  const counterClasses =
    'rounded-xl border border-ink/10 bg-ivory-deep/40 px-3 py-2.5 text-center'
  const tabTriggerClasses =
    'h-auto w-full py-3 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint data-active:text-ink data-active:after:bg-brass hover:text-yellow-400'

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-ivory text-ink">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-light tracking-[-0.01em]">Protocolo</h1>
            <p className="mt-1 truncate font-serif text-[0.6rem] uppercase tracking-[0.3em] text-ink-faint">
              Javier &amp; Maria · 12 sep 2026
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-label="Estado de conexión"
              className={`inline-flex items-center gap-1.5 font-serif text-[0.6rem] uppercase tracking-[0.25em] ${
                realtimeStatus === 'live' ? 'text-brass' : realtimeStatus === 'offline' ? 'text-red-700/70' : 'text-ink-faint'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  realtimeStatus === 'live' ? 'bg-brass' : realtimeStatus === 'offline' ? 'bg-red-700/70' : 'bg-ink-faint animate-pulse'
                }`}
              />
              {realtimeStatus === 'live' ? 'En vivo' : realtimeStatus === 'offline' ? 'Offline' : '…'}
            </span>
            {user?.role && (
              <span className="border border-brass/30 bg-brass/10 px-2.5 py-1 font-serif text-[0.6rem] uppercase tracking-[0.25em] text-brass">
                {user.role}
              </span>
            )}
            <ChatButton user={user} />
            {permission !== 'unsupported' && (
              <button
                type="button"
                onClick={requestPermission}
                disabled={permission !== 'default'}
                title={
                  permission === 'granted'
                    ? 'Notificaciones activadas'
                    : permission === 'denied'
                      ? 'Notificaciones bloqueadas en el navegador'
                      : 'Activar notificaciones del navegador'
                }
                aria-label="Notificaciones"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                  permission === 'granted'
                    ? 'border-brass bg-brass/10 text-brass'
                    : 'border-ink/30 text-ink hover:bg-ink hover:text-ivory disabled:cursor-not-allowed disabled:opacity-40'
                }`}
              >
                {permission === 'granted' ? (
                  <BellRing className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-ivory"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-px animate-pulse bg-ink/20" />
              <p className="font-serif text-sm italic text-ink-soft">Cargando invitados…</p>
            </div>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="sr-only">Buscar invitado</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o correo…"
                  className="w-full border-b border-ink/20 bg-transparent py-2 pl-7 pr-8 font-serif text-base font-light placeholder:text-ink/25 focus:border-brass focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-ink/40 transition-colors hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </label>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(String(value))} className="mt-6">
              <TabsList variant="line" className="mb-5 grid h-auto w-full grid-cols-2 border-b border-ink/10">
                <TabsTrigger value="rsvp" className={tabTriggerClasses}>
                  RSVP
                </TabsTrigger>
                <TabsTrigger value="checkin" className={tabTriggerClasses}>
                  Check-in
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rsvp" className="focus:outline-none">
                <section aria-label="Resumen de confirmaciones" className="mb-5 grid grid-cols-3 gap-2">
                  <div className={`${counterClasses} border-brass/30 bg-brass/10`}>
                    <p className="font-serif text-2xl font-light text-brass">{stats.confirmed}</p>
                    <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                      Confirmados
                    </p>
                  </div>
                  <div className={counterClasses}>
                    <p className="font-serif text-2xl font-light">{stats.pending}</p>
                    <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                      Pendientes
                    </p>
                  </div>
                  <div className={counterClasses}>
                    <p className="font-serif text-2xl font-light">{stats.declined}</p>
                    <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                      Rechazados
                    </p>
                  </div>
                </section>

                {filteredGuests.length === 0 ? (
                  <p className="py-12 text-center font-serif text-sm italic text-ink-soft">
                    Sin resultados para “{search}”
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {filteredGuests.map((guest) => {
                      const status = statusFor(guest)
                      return (
                        <motion.li
                          key={guest.id}
                          layout
                          transition={SPRING_SOFT}
                          className={cardClasses}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-serif text-lg font-light">{guest.full_name}</p>
                              <p className="mt-0.5 font-serif text-xs text-ink-soft">
                                {guest.plus_ones > 0
                                  ? `+${guest.plus_ones} acompañante${guest.plus_ones > 1 ? 's' : ''}`
                                  : 'Sin acompañantes'}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-3 py-1 font-serif text-[0.6rem] uppercase tracking-[0.2em] ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <Tappable
                              type="button"
                              onClick={() => setAttendance(guest, true)}
                              aria-pressed={guest.is_attending === true}
                              whileTap={{ scale: 0.96 }}
                              className={`rounded-full border py-3 font-serif text-xs uppercase tracking-[0.2em] ${
                                guest.is_attending === true
                                  ? 'border-brass bg-brass text-ivory'
                                  : 'border-brass/40 text-brass hover:bg-brass/10'
                              }`}
                            >
                              Confirmar
                            </Tappable>
                            <Tappable
                              type="button"
                              onClick={() => setAttendance(guest, false)}
                              aria-pressed={guest.is_attending === false}
                              whileTap={{ scale: 0.96 }}
                              className={`rounded-full border py-3 font-serif text-xs uppercase tracking-[0.2em] ${
                                guest.is_attending === false
                                  ? 'border-red-700 bg-red-700 text-ivory'
                                  : 'border-red-700/40 text-red-700/80 hover:bg-red-700/10'
                              }`}
                            >
                              Rechazar
                            </Tappable>
                          </div>
                        </motion.li>
                      )
                    })}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="checkin" className="pb-24 focus:outline-none">
                <section aria-label="Resumen de llegadas" className="mb-5 grid grid-cols-3 gap-2">
                  <div className={`${counterClasses} border-brass/30 bg-brass/10`}>
                    <p className="font-serif text-2xl font-light text-brass">{stats.arrived}</p>
                    <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                      Llegaron
                    </p>
                  </div>
                  <div className={counterClasses}>
                    <p className="font-serif text-2xl font-light">{stats.ceremony}</p>
                    <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                      Ceremonia
                    </p>
                  </div>
                  <div className={counterClasses}>
                    <p className="font-serif text-2xl font-light">{stats.brindis}</p>
                    <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                      Brindis
                    </p>
                  </div>
                </section>

                <section aria-label="Modos de llegada" className="-mt-3 mb-5 grid grid-cols-3 gap-2">
                  <div className={counterClasses}>
                    <p className="font-serif text-xl font-light">{stats.alone}</p>
                    <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                      Solos
                    </p>
                  </div>
                  <div className={counterClasses}>
                    <p className="font-serif text-xl font-light">{stats.withCompanion}</p>
                    <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                      Con acomp.
                    </p>
                  </div>
                  <div className={counterClasses}>
                    <p className="font-serif text-xl font-light">{stats.companionOnly}</p>
                    <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                      Solo acomp.
                    </p>
                  </div>
                </section>

                {checkinGuests.length === 0 ? (
                  <p className="py-12 text-center font-serif text-sm italic text-ink-soft">
                    Sin resultados para “{search}”
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {checkinGuests.map((guest) => (
                      <motion.li
                        key={guest.id}
                        layout
                        transition={SPRING_SOFT}
                        className={cardClasses}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-serif text-lg font-light">{guest.full_name}</p>
                            <p className="mt-0.5 font-serif text-xs text-ink-soft">
                              {guest.plus_ones > 0
                                ? `+${guest.plus_ones} acompañante${guest.plus_ones > 1 ? 's' : ''}`
                                : 'Sin acompañantes'}
                            </p>
                          </div>
                          {guest.is_courtesy && (
                            <span className="shrink-0 rounded-full border border-ink/15 bg-ink/5 px-3 py-1 font-serif text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">
                              Cortesía
                            </span>
                          )}
                        </div>

                        {!guest.checked_in_at ? (
                          <Tappable
                            type="button"
                            onClick={() => markArrival(guest)}
                            whileTap={{ scale: 0.97 }}
                            className="mt-4 w-full rounded-full border border-brass bg-brass py-3 font-serif text-xs uppercase tracking-[0.25em] text-ivory"
                          >
                            Marcar llegada
                          </Tappable>
                        ) : (
                          <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full border border-brass/30 bg-brass/10 px-4 py-2 font-serif text-xs text-brass">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            {formatArrival(guest.checked_in_at)}
                          </div>
                        )}
                      </motion.li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <AnimatePresence>
        {activeTab === 'checkin' && !loading && !sheetOpen && arrivedGuests.length > 0 && (
          <motion.button
            key="fab-llegados"
            type="button"
            onClick={() => setSheetOpen(true)}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.9 }}
            transition={SPRING_SOFT}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-brass bg-brass px-6 py-3 font-serif text-xs uppercase tracking-[0.25em] text-ivory shadow-lg shadow-ink/15"
          >
            <Users className="h-4 w-4" />
            {arrivedGuests.length} {arrivedGuests.length === 1 ? 'llegado' : 'llegados'}
            <ChevronUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent onCloseRequest={() => setSheetOpen(false)} className="bg-ivory text-ink ring-ink/10">
          <DialogTitle className="px-5 font-serif text-xl font-light tracking-[-0.01em]">
            Llegados ({arrivedGuests.length})
          </DialogTitle>

          <div className="-mx-1 max-h-[65dvh] overflow-y-auto px-1 pb-1">
            {arrivedGuests.length === 0 ? (
              <p className="py-10 text-center font-serif text-sm italic text-ink-soft">
                Aún no hay llegadas
              </p>
            ) : (
              <ul className="space-y-3">
                {arrivedGuests.map((guest) => (
                  <motion.li
                    key={guest.id}
                    layout
                    transition={SPRING_SOFT}
                    className={cardClasses}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-serif text-lg font-light">{guest.full_name}</p>
                        <p className="mt-0.5 font-serif text-xs text-ink-soft">
                          {guest.plus_ones > 0
                            ? `+${guest.plus_ones} acompañante${guest.plus_ones > 1 ? 's' : ''}`
                            : 'Sin acompañantes'}
                        </p>
                      </div>
                      {guest.is_courtesy && (
                        <span className="shrink-0 rounded-full border border-ink/15 bg-ink/5 px-3 py-1 font-serif text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">
                          Cortesía
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 rounded-full border border-brass/30 bg-brass/10 px-4 py-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 font-serif text-xs text-brass">
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{formatArrival(guest.checked_in_at!)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => undoArrival(guest)}
                        className="shrink-0 font-serif text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint underline underline-offset-4 transition-colors hover:text-ink"
                      >
                        Deshacer
                      </button>
                    </div>

                    {guest.plus_ones > 0 && (
                      <div className="mt-3">
                        <p className="font-serif text-[0.6rem] uppercase tracking-[0.25em] text-ink-faint">
                          ¿Quién llegó?
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {ARRIVAL_MODES.map((mode) => {
                            const activeMode = guest.arrival_mode === mode.value
                            return (
                              <Tappable
                                key={mode.value}
                                type="button"
                                onClick={() => setArrivalMode(guest, mode.value)}
                                aria-pressed={activeMode}
                                whileTap={{ scale: 0.95 }}
                                className={`rounded-full border px-2 py-2.5 font-serif text-[0.6rem] uppercase tracking-[0.12em] ${
                                  activeMode
                                    ? 'border-brass bg-brass text-ivory'
                                    : 'border-ink/20 text-ink-faint hover:border-ink/40'
                                }`}
                              >
                                {mode.label}
                              </Tappable>
                            )
                          })}
                        </div>

                        {guest.arrival_mode === 'with_companion' && (
                          <div className="mt-2 flex items-center justify-between rounded-full border border-ink/15 px-3 py-1.5">
                            <span className="font-serif text-xs text-ink-soft">
                              Acompañantes llegados
                            </span>
                            <span className="flex items-center gap-2">
                              <Tappable
                                type="button"
                                onClick={() => adjustCompanionsArrived(guest, -1)}
                                disabled={(guest.companions_arrived ?? 0) <= 1}
                                aria-label="Un acompañante menos"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 text-ink transition-colors hover:bg-ink hover:text-ivory disabled:pointer-events-none disabled:opacity-30"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Tappable>
                              <span className="min-w-14 text-center font-serif text-sm">
                                {guest.companions_arrived ?? 0}
                                <span className="text-xs text-ink/40"> / {guest.plus_ones}</span>
                              </span>
                              <Tappable
                                type="button"
                                onClick={() => adjustCompanionsArrived(guest, 1)}
                                disabled={(guest.companions_arrived ?? 0) >= guest.plus_ones}
                                aria-label="Un acompañante más"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 text-ink transition-colors hover:bg-ink hover:text-ivory disabled:pointer-events-none disabled:opacity-30"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Tappable>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <Tappable
                        type="button"
                        onClick={() => togglePart(guest, 'attended_ceremony')}
                        aria-pressed={guest.attended_ceremony}
                        whileTap={{ scale: 0.95 }}
                        className={`flex-1 rounded-full border py-2.5 font-serif text-[0.65rem] uppercase tracking-[0.2em] ${
                          guest.attended_ceremony
                            ? 'border-brass bg-brass/10 text-brass'
                            : 'border-ink/20 text-ink-faint hover:border-ink/40'
                        }`}
                      >
                        Ceremonia
                      </Tappable>
                      <Tappable
                        type="button"
                        onClick={() => togglePart(guest, 'attended_brindis')}
                        aria-pressed={guest.attended_brindis}
                        whileTap={{ scale: 0.95 }}
                        className={`flex-1 rounded-full border py-2.5 font-serif text-[0.65rem] uppercase tracking-[0.2em] ${
                          guest.attended_brindis
                            ? 'border-brass bg-brass/10 text-brass'
                            : 'border-ink/20 text-ink-faint hover:border-ink/40'
                        }`}
                      >
                        Brindis
                      </Tappable>
                    </div>

                    <textarea
                      rows={2}
                      value={noteDraftFor(guest)}
                      onChange={(e) =>
                        setNotesDrafts((prev) => ({ ...prev, [guest.id]: e.target.value }))
                      }
                      placeholder="Comentarios de protocolo…"
                      className="mt-4 w-full resize-none border-b border-ink/20 bg-transparent pb-2 font-serif text-sm font-light placeholder:text-ink/25 focus:border-brass focus:outline-none"
                    />

                    <AnimatePresence initial={false}>
                      {noteDirtyFor(guest) && (
                        <motion.div
                          key="save-note"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={SPRING_SOFT}
                          className="overflow-hidden"
                        >
                          <Tappable
                            type="button"
                            onClick={() => saveNotes(guest)}
                            whileTap={{ scale: 0.97 }}
                            className="mt-2 w-full rounded-full border border-ink py-2.5 font-serif text-[0.65rem] uppercase tracking-[0.25em] text-ink"
                          >
                            Guardar nota
                          </Tappable>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {savedNoteId === guest.id && (
                      <p className="mt-2 text-center font-serif text-xs italic text-brass">
                        Nota guardada
                      </p>
                    )}
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Dialog>
    </div>
    </MotionConfig>
  )
}
