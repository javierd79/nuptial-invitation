'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { Check, ChevronDown, Copy, LogOut, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { logout } from '@/app/admin/login/actions'
import { formatBs, formatPhone, formatUsd, formatUsdt } from '@/lib/format'
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog'
import { Collapse, SPRING_SOFT, Tappable } from '@/components/motion'
import type { AdminGuestPatch, Gender, Guest, SessionUser } from '@/lib/data/types'

/** How often the panel re-reads the JSON file, replacing the old realtime feed. */
const POLL_INTERVAL_MS = 15000

interface Metrics {
  total_guests: number
  total_plus_ones: number
  confirmed: number
  declined: number
  pending: number
  courtesy: number
  courtesy_attending: number
  godparents: number
  estimated_attendees: number
  gift_count: number
  sum_usd: number
  sum_bs: number
}

const PHONE_COUNTRY_CODES = [
  { value: '58', label: '+58' },
  { value: '1', label: '+1' },
  { value: '57', label: '+57' },
]

const PHONE_PREFIXES = [
  { value: '412', label: '0412' },
  { value: '422', label: '0422' },
  { value: '416', label: '0416' },
  { value: '414', label: '0414' },
  { value: '424', label: '0424' },
]

interface PhoneDraft {
  country: string
  prefix: string
  digits: string
}

const EMPTY_PHONE_DRAFT: PhoneDraft = { country: '58', prefix: '412', digits: '' }

type SyncState = 'loading' | 'live' | 'error'

const EMPTY_METRICS: Metrics = {
  total_guests: 0,
  total_plus_ones: 0,
  confirmed: 0,
  declined: 0,
  pending: 0,
  courtesy: 0,
  courtesy_attending: 0,
  godparents: 0,
  estimated_attendees: 0,
  gift_count: 0,
  sum_usd: 0,
  sum_bs: 0,
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })

/** Thin wrapper so a failed request surfaces a message instead of a silent no-op. */
async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  })

  if (response.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('No autenticado.')
  }

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string }

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Error inesperado.')
  }

  return payload
}

export default function AdminDashboard() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS)
  const [loading, setLoading] = useState(true)
  const [sync, setSync] = useState<SyncState>('loading')
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    plus_ones: '0',
    is_godparent: false,
    is_courtesy: false,
    courtesy_plus_ones: '0',
    gender: '',
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [phoneEditorId, setPhoneEditorId] = useState<string | null>(null)
  const [phoneDraft, setPhoneDraft] = useState<PhoneDraft>(EMPTY_PHONE_DRAFT)
  const [nameEditorId, setNameEditorId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const calculateMetrics = (list: Guest[]) => {
    const attending = list.filter((g) => g.is_attending === true)
    const courtesyGuests = list.filter((g) => g.is_courtesy)
    setMetrics({
      total_guests: list.length,
      total_plus_ones: list.reduce((sum, g) => sum + g.plus_ones, 0),
      confirmed: attending.length,
      declined: list.filter((g) => g.is_attending === false).length,
      pending: list.filter((g) => g.is_attending === null && !g.is_courtesy).length,
      courtesy: courtesyGuests.length,
      courtesy_attending: courtesyGuests.reduce((sum, g) => sum + g.courtesy_plus_ones, 0),
      godparents: list.filter((g) => g.is_godparent).length,
      estimated_attendees:
        attending.reduce((sum, g) => sum + 1 + g.plus_ones, 0) +
        courtesyGuests.reduce((sum, g) => sum + g.courtesy_plus_ones, 0),
      gift_count: list.filter((g) => g.gift_type != null).length,
      sum_usd: list.reduce((sum, g) => sum + (g.gift_amount_usd ?? 0), 0),
      sum_bs: list.reduce((sum, g) => sum + (g.gift_amount_bs ?? 0), 0),
    })
  }

  const loadGuests = useCallback(async () => {
    try {
      const { guests: list } = await apiRequest<{ guests: Guest[] }>('/api/admin/guests')
      setGuests(list)
      calculateMetrics(list)
      setSync('live')
    } catch (error) {
      console.error('Error loading guests:', error)
      setSync('error')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const { user: sessionUser } = await apiRequest<{ user: SessionUser }>('/api/admin/session')
        if (cancelled) return
        setUser(sessionUser)
        await loadGuests()
        if (!cancelled) setLoading(false)
      } catch (error) {
        console.error('Error reading session:', error)
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [loadGuests])

  // Stands in for the realtime subscription: the JSON file has no change feed.
  useEffect(() => {
    if (loading) return

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadGuests()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [loading, loadGuests])

  const patchGuest = async (guest: Guest, patch: AdminGuestPatch) => {
    setGuests((prev) =>
      prev.map((item) => (item.id === guest.id ? { ...item, ...patch } : item)),
    )

    try {
      await apiRequest(`/api/admin/guests/${guest.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
    } catch (error) {
      console.error('Error updating guest:', error)
      loadGuests()
    }
  }

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.full_name.trim() === '' || formData.email.trim() === '') {
      setMessage({ type: 'error', text: 'Nombre y correo son obligatorios.' })
      return
    }

    try {
      await apiRequest<{ guest: Guest }>('/api/admin/guests', {
        method: 'POST',
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          plus_ones: parseInt(formData.plus_ones) || 0,
          is_godparent: formData.is_godparent,
          is_courtesy: formData.is_courtesy,
          courtesy_plus_ones: formData.is_courtesy ? parseInt(formData.courtesy_plus_ones) || 0 : 0,
          gender: formData.gender || null,
        }),
      })

      setMessage(null)
      setFormData({
        full_name: '',
        email: '',
        plus_ones: '0',
        is_godparent: false,
        is_courtesy: false,
        courtesy_plus_ones: '0',
        gender: '',
      })
      setAddSheetOpen(false)
      loadGuests()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al agregar el invitado.',
      })
    }
  }

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/?guest=${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const updateCourtesyPlusOnes = async (guest: Guest, value: number) => {
    const next = Math.max(0, Math.min(value, guest.plus_ones))
    if (next === guest.courtesy_plus_ones) return
    await patchGuest(guest, { courtesy_plus_ones: next })
  }

  const updateCourtesyStatus = async (guest: Guest, isCourtesy: boolean) => {
    await patchGuest(guest, {
      is_courtesy: isCourtesy,
      courtesy_plus_ones: isCourtesy ? guest.courtesy_plus_ones : 0,
    })
  }

  const updateGender = async (guest: Guest, gender: Gender) => {
    await patchGuest(guest, { gender: guest.gender === gender ? null : gender })
  }

  const openNameEditor = (guest: Guest) => {
    setNameDraft(guest.full_name)
    setEmailDraft(guest.email)
    setNameEditorId(guest.id)
  }

  const closeNameEditor = () => {
    setNameEditorId(null)
    setNameDraft('')
    setEmailDraft('')
  }

  const saveName = async (guest: Guest) => {
    const fullName = nameDraft.trim()
    const email = emailDraft.trim().toLowerCase()

    if (fullName === '') {
      setMessage({ type: 'error', text: 'El nombre no puede quedar vacío.' })
      return
    }

    // An empty email is valid (a couple can share one link), so only send the
    // field when it actually changed.
    const patch: AdminGuestPatch = { full_name: fullName }
    if (email !== '' && email !== guest.email) patch.email = email

    closeNameEditor()
    await patchGuest(guest, patch)
  }

  const removeGuest = async (guest: Guest) => {
    if (!window.confirm(`¿Eliminar a ${guest.full_name}? Su enlace dejará de funcionar.`)) return

    try {
      await apiRequest(`/api/admin/guests/${guest.id}`, { method: 'DELETE' })
      loadGuests()
    } catch (error) {
      console.error('Error deleting guest:', error)
    }
  }

  const handleImportFile = async (file: File) => {
    setImportMessage(null)

    let rows: unknown
    try {
      rows = JSON.parse(await file.text())
    } catch {
      setImportMessage({ type: 'error', text: 'El archivo no es JSON válido.' })
      return
    }

    if (!Array.isArray(rows)) {
      setImportMessage({ type: 'error', text: 'El archivo debe contener un arreglo de invitados.' })
      return
    }

    if (!window.confirm(`Esto reemplaza los ${guests.length} invitados actuales por ${rows.length}. ¿Continuar?`)) {
      return
    }

    try {
      const { imported, skipped } = await apiRequest<{ imported: number; skipped: number }>(
        '/api/admin/import',
        { method: 'POST', body: JSON.stringify(rows) },
      )
      setImportMessage({
        type: 'success',
        text:
          skipped > 0
            ? `Se importaron ${imported} invitados; se omitieron ${skipped} filas sin id válido o con correo repetido.`
            : `Se importaron ${imported} invitados.`,
      })
      loadGuests()
    } catch (error) {
      setImportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo importar.',
      })
    }
  }

  const phoneDraftFor = (guest: Guest): PhoneDraft => {
    const match = /^\+(\d{1,3})(\d+)$/.exec(guest.phone ?? '')
    if (!match) return EMPTY_PHONE_DRAFT
    const [, country, rest] = match
    if (country === '58') {
      return { country, prefix: rest.slice(0, 3), digits: rest.slice(3) }
    }
    return { country, prefix: '412', digits: rest }
  }

  const openPhoneEditor = (guest: Guest) => {
    setPhoneDraft(phoneDraftFor(guest))
    setPhoneEditorId(guest.id)
  }

  const closePhoneEditor = () => {
    setPhoneEditorId(null)
    setPhoneDraft(EMPTY_PHONE_DRAFT)
  }

  const savePhone = async (guest: Guest) => {
    if (phoneDraft.digits.length !== (phoneDraft.country === '58' ? 7 : 10)) return
    const prefix = phoneDraft.country === '58' ? phoneDraft.prefix : ''
    const phone = `+${phoneDraft.country}${prefix}${phoneDraft.digits}`

    closePhoneEditor()
    await patchGuest(guest, { phone })
  }

  const removePhone = async (guest: Guest) => {
    if (phoneEditorId === guest.id) closePhoneEditor()
    await patchGuest(guest, { phone: null })
  }

  const giftFor = (guest: Guest): { label: string; value: string } | null => {
    if (guest.gift_type === 'fisico') {
      return guest.gift_description ? { label: 'Físico', value: guest.gift_description } : null
    }
    if (guest.gift_type === 'efectivo') {
      return guest.gift_amount_usd != null ? { label: 'Efectivo', value: formatUsd(guest.gift_amount_usd) } : null
    }
    if (guest.gift_type === 'pago_movil') {
      return guest.gift_amount_bs != null ? { label: 'Pago móvil', value: formatBs(guest.gift_amount_bs) } : null
    }
    if (guest.gift_type === 'binance') {
      return guest.gift_amount_usd != null ? { label: 'Binance', value: formatUsdt(guest.gift_amount_usd) } : null
    }
    if (guest.gift_type === 'paypal') {
      return guest.gift_amount_usd != null ? { label: 'PayPal', value: formatUsd(guest.gift_amount_usd) } : null
    }
    return null
  }

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

  const filteredGuests = guests.filter((guest) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      guest.full_name.toLowerCase().includes(query) ||
      guest.email.toLowerCase().includes(query)
    )
  })

  const inputClasses =
    'mt-2 w-full border-b border-ink/20 bg-transparent pb-2 font-serif text-lg font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none'
  const phoneFieldClasses =
    'min-w-0 flex-1 border-b border-ink/20 bg-transparent pb-2 font-serif text-base font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none'
  const phoneSelectClasses =
    'border-b border-ink/20 bg-transparent pb-2 font-serif text-base font-light text-ink focus:border-brass focus:outline-none'
  const labelClasses = 'font-serif text-[0.6rem] uppercase tracking-[0.25em] text-ink-faint'
  const cardClasses = 'rounded-2xl border border-ink/10 bg-ivory-deep/40 p-4'
  const counterClasses =
    'rounded-xl border border-ink/10 bg-ivory-deep/40 px-3 py-2.5 text-center'
  const fabClasses =
    'fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-brass bg-brass px-6 py-3 font-serif text-xs uppercase tracking-[0.25em] text-ivory shadow-lg shadow-ink/15 transition-colors hover:bg-brass/90'

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-ivory text-ink">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-4 md:max-w-2xl">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-light tracking-[-0.01em]">Panel</h1>
            <p className="mt-1 truncate font-serif text-[0.6rem] uppercase tracking-[0.3em] text-ink-faint">
              Javier &amp; Maria · 12 sep 2026
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-label="Estado de sincronización"
              title={
                sync === 'live'
                  ? 'Sincronizado'
                  : sync === 'error'
                    ? 'Error al leer los datos'
                    : 'Cargando'
              }
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                sync === 'live'
                  ? 'bg-brass'
                  : sync === 'error'
                    ? 'bg-red-700/70'
                    : 'bg-ink-faint animate-pulse'
              }`}
            />
            {user?.role && (
              <span className="shrink-0 border border-brass/30 bg-brass/10 px-2.5 py-1 font-serif text-[0.6rem] uppercase tracking-[0.25em] text-brass">
                {user.role}
              </span>
            )}
            <button
              type="button"
              onClick={loadGuests}
              aria-label="Refrescar invitados"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-ivory"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-ivory"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-6 md:max-w-2xl">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-px animate-pulse bg-ink/20" />
              <p className="font-serif text-sm italic text-ink-soft">Cargando panel…</p>
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

            <motion.div
              className="mt-6 pb-24"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
                <section aria-label="Métricas de invitados">
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`${counterClasses} border-brass/30 bg-brass/10`}>
                      <p className="font-serif text-2xl font-light tabular-nums text-brass">{metrics.confirmed}</p>
                      <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                        Confirmados
                      </p>
                    </div>
                    <div className={counterClasses}>
                      <p className="font-serif text-2xl font-light tabular-nums">{metrics.pending}</p>
                      <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                        Pendientes
                      </p>
                    </div>
                    <div className={counterClasses}>
                      <p className="font-serif text-2xl font-light tabular-nums text-red-700/70">{metrics.declined}</p>
                      <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                        Rechazó
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className={counterClasses}>
                      <p className="font-serif text-xl font-light tabular-nums">{metrics.total_guests}</p>
                      <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                        Invitados
                      </p>
                    </div>
                    <div className={counterClasses}>
                      <p className="font-serif text-xl font-light tabular-nums">{metrics.total_plus_ones}</p>
                      <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                        Acompañantes
                      </p>
                    </div>
                    <div className={counterClasses}>
                      <p className="font-serif text-xl font-light tabular-nums">{metrics.estimated_attendees}</p>
                      <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                        Asistentes est.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMetricsOpen((current) => !current)}
                    aria-expanded={metricsOpen}
                    className="mt-2 flex w-full items-center justify-between rounded-xl border border-ink/10 bg-ivory-deep/40 px-4 py-3 font-serif text-[0.65rem] uppercase tracking-[0.25em] text-ink-faint transition-colors hover:text-ink"
                  >
                    Más métricas
                    <motion.span
                      animate={{ rotate: metricsOpen ? 180 : 0 }}
                      transition={SPRING_SOFT}
                      className="inline-flex"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.span>
                  </button>

                  <Collapse open={metricsOpen}>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      <div className={counterClasses}>
                        <p className="font-serif text-xl font-light tabular-nums">{metrics.courtesy}</p>
                        <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                          Cortesía
                        </p>
                      </div>
                      <div className={counterClasses}>
                        <p className="font-serif text-xl font-light tabular-nums">{metrics.courtesy_attending}</p>
                        <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                          Acomp. cortesía
                        </p>
                      </div>
                      <div className={counterClasses}>
                        <p className="font-serif text-xl font-light tabular-nums">{metrics.godparents}</p>
                        <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                          Padrinos
                        </p>
                      </div>
                      <div className={`${counterClasses} border-brass/30 bg-brass/5`}>
                        <p className="font-serif text-xl font-light tabular-nums text-brass">{metrics.gift_count}</p>
                        <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                          Regalos decl.
                        </p>
                      </div>
                      <div className={`${counterClasses} border-brass/30 bg-brass/5`}>
                        <p className="font-serif text-lg font-light tabular-nums text-brass">{formatUsd(metrics.sum_usd)}</p>
                        <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                          Total USD
                        </p>
                      </div>
                      <div className={`${counterClasses} border-brass/30 bg-brass/5`}>
                        <p className="font-serif text-lg font-light tabular-nums text-brass">{formatBs(metrics.sum_bs)}</p>
                        <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                          Total Bs.
                        </p>
                      </div>
                    </div>
                  </Collapse>
                </section>

                {guests.length === 0 ? (
                  <p className="py-12 text-center font-serif text-sm italic text-ink-soft">
                    Aún no hay invitados.
                  </p>
                ) : filteredGuests.length === 0 ? (
                  <p className="py-12 text-center font-serif text-sm italic text-ink-soft">
                    Ningún invitado coincide con la búsqueda.
                  </p>
                ) : (
                  <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
                    {filteredGuests.map((guest) => {
                      const status = statusFor(guest)
                      const gift = giftFor(guest)
                      const expanded = expandedGuestId === guest.id
                      return (
                        <motion.li
                          key={guest.id}
                          layout
                          transition={SPRING_SOFT}
                          className={cardClasses}
                        >
                          <Tappable
                            type="button"
                            onClick={() => setExpandedGuestId(expanded ? null : guest.id)}
                            aria-expanded={expanded}
                            whileTap={{ scale: 0.985 }}
                            className="flex w-full items-start justify-between gap-3 text-left"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-serif text-lg font-light">{guest.full_name}</span>
                              <span className="mt-0.5 block font-serif text-xs text-ink-soft">
                                {guest.plus_ones > 0
                                  ? `+${guest.plus_ones} acompañante${guest.plus_ones > 1 ? 's' : ''}`
                                  : 'Sin acompañantes'}
                              </span>
                              {guest.is_godparent && (
                                <span className="mt-1 inline-block rounded-full border border-brass/40 px-2.5 py-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-brass">
                                  {guest.gender === 'female' ? 'Madrina' : 'Padrino'}
                                </span>
                              )}
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
                              <span
                                className={`rounded-full border px-3 py-1 font-serif text-[0.6rem] uppercase tracking-[0.2em] ${status.className}`}
                              >
                                {status.label}
                              </span>
                              <motion.span
                                animate={{ rotate: expanded ? 180 : 0 }}
                                transition={SPRING_SOFT}
                                className="inline-flex shrink-0 text-ink-faint"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </motion.span>
                            </span>
                          </Tappable>

                          <Collapse open={expanded}>
                            <div className="mt-4 space-y-4 border-t border-ink/10 pt-4">
                              <div>
                                {nameEditorId === guest.id ? (
                                  <div className="space-y-2">
                                    <div className="flex items-end gap-2">
                                      <input
                                        type="text"
                                        value={nameDraft}
                                        autoFocus
                                        onChange={(e) => setNameDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveName(guest)
                                          if (e.key === 'Escape') closeNameEditor()
                                        }}
                                        aria-label="Nombre completo"
                                        className={phoneFieldClasses}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => saveName(guest)}
                                        className="shrink-0 rounded-full border border-ink bg-ink px-4 py-1.5 font-serif text-[0.6rem] uppercase tracking-[0.2em] text-ivory"
                                      >
                                        Guardar
                                      </button>
                                    </div>
                                    <input
                                      type="email"
                                      value={emailDraft}
                                      onChange={(e) => setEmailDraft(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveName(guest)
                                        if (e.key === 'Escape') closeNameEditor()
                                      }}
                                      placeholder="correo (opcional)"
                                      aria-label="Correo electrónico"
                                      className={`${phoneFieldClasses} text-sm`}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="min-w-0 truncate font-serif text-base font-light">
                                      {guest.full_name}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => openNameEditor(guest)}
                                      className="shrink-0 font-serif text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint underline underline-offset-4 transition-colors hover:text-ink"
                                    >
                                      Editar
                                    </button>
                                  </div>
                                )}
                                {nameEditorId !== guest.id && (
                                  <p
                                    className={`mt-0.5 break-all font-serif text-xs ${guest.email === '' ? 'italic text-ink-faint' : 'text-ink-soft'}`}
                                  >
                                    {guest.email === '' ? 'sin correo' : guest.email}
                                  </p>
                                )}
                                <p className="mt-0.5 font-serif text-[0.65rem] italic text-ink-faint">
                                  Registrado · {formatDate(guest.created_at)}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {(['female', 'male'] as const).map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => updateGender(guest, value)}
                                    className={`rounded-full border px-3.5 py-1.5 font-serif text-[0.6rem] uppercase tracking-[0.15em] transition-colors ${
                                      guest.gender === value
                                        ? 'border-ink bg-ink text-ivory'
                                        : 'border-ink/20 text-ink-faint hover:border-ink/50 hover:text-ink'
                                    }`}
                                  >
                                    {value === 'female' ? 'Mujer' : 'Hombre'}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => updateCourtesyStatus(guest, !guest.is_courtesy)}
                                  className="rounded-full border border-ink/20 px-3.5 py-1.5 font-serif text-[0.6rem] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:border-ink/50 hover:text-ink"
                                >
                                  {guest.is_courtesy ? 'Quitar cortesía' : 'Marcar cortesía'}
                                </button>
                              </div>

                              {guest.is_courtesy && (
                                <div className="flex items-center justify-between rounded-full border border-ink/15 px-3 py-1.5">
                                  <span className="font-serif text-xs text-ink-soft">Acompañantes que asisten</span>
                                  <span className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      aria-label="Quitar un acompañante que asiste"
                                      onClick={() => updateCourtesyPlusOnes(guest, guest.courtesy_plus_ones - 1)}
                                      disabled={guest.courtesy_plus_ones <= 0}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 font-serif text-sm text-ink transition-colors hover:bg-ink hover:text-ivory disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                      −
                                    </button>
                                    <span className="min-w-14 text-center font-serif text-sm tabular-nums">
                                      {guest.courtesy_plus_ones}
                                      <span className="text-xs text-ink/40"> / {guest.plus_ones}</span>
                                    </span>
                                    <button
                                      type="button"
                                      aria-label="Agregar un acompañante que asiste"
                                      onClick={() => updateCourtesyPlusOnes(guest, guest.courtesy_plus_ones + 1)}
                                      disabled={guest.courtesy_plus_ones >= guest.plus_ones}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 font-serif text-sm text-ink transition-colors hover:bg-ink hover:text-ivory disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                      +
                                    </button>
                                  </span>
                                </div>
                              )}

                              <div>
                                <p className={labelClasses}>Regalo declarado</p>
                                {gift ? (
                                  <p className="mt-1 font-serif text-sm text-ink">
                                    <span className="text-ink-faint">{gift.label}: </span>
                                    {gift.value}
                                  </p>
                                ) : (
                                  <p className="mt-1 font-serif text-sm italic text-ink-faint">Sin regalo declarado</p>
                                )}
                              </div>

                              <div>
                                <p className={labelClasses}>Teléfono</p>
                                {phoneEditorId === guest.id ? (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    transition={SPRING_SOFT}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-2 space-y-3">
                                      <div className="flex items-end gap-2">
                                        <select
                                          value={phoneDraft.country}
                                          onChange={(e) =>
                                            setPhoneDraft((prev) => ({
                                              ...prev,
                                              country: e.target.value,
                                              digits: prev.digits.slice(0, e.target.value === '58' ? 7 : 10),
                                            }))
                                          }
                                          aria-label="Código de país"
                                          className={`${phoneSelectClasses} w-20 shrink-0`}
                                        >
                                          {PHONE_COUNTRY_CODES.map((code) => (
                                            <option key={code.value} value={code.value}>
                                              {code.label}
                                            </option>
                                          ))}
                                        </select>
                                        {phoneDraft.country === '58' && (
                                          <select
                                            value={phoneDraft.prefix}
                                            onChange={(e) =>
                                              setPhoneDraft((prev) => ({ ...prev, prefix: e.target.value }))
                                            }
                                            aria-label="Prefijo"
                                            className={`${phoneSelectClasses} w-[4.5rem] shrink-0`}
                                          >
                                            {PHONE_PREFIXES.map((prefix) => (
                                              <option key={prefix.value} value={prefix.value}>
                                                {prefix.label}
                                              </option>
                                            ))}
                                          </select>
                                        )}
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          autoComplete="off"
                                          value={phoneDraft.digits}
                                          onChange={(e) =>
                                            setPhoneDraft((prev) => ({
                                              ...prev,
                                              digits: e.target.value.replace(/\D/g, '').slice(0, phoneDraft.country === '58' ? 7 : 10),
                                            }))
                                          }
                                          placeholder={phoneDraft.country === '58' ? '0000000' : '0000000000'}
                                          className={phoneFieldClasses}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => savePhone(guest)}
                                          disabled={
                                            phoneDraft.digits.length !==
                                            (phoneDraft.country === '58' ? 7 : 10)
                                          }
                                          className="flex-1 rounded-full border border-ink bg-ink py-2 font-serif text-[0.65rem] uppercase tracking-[0.25em] text-ivory transition-colors hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-40"
                                        >
                                          Guardar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={closePhoneEditor}
                                          className="rounded-full border border-ink/30 px-6 py-2 font-serif text-[0.65rem] uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-ivory"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                ) : guest.phone ? (
                                  <p className="mt-1 flex items-center justify-between gap-2 font-serif text-sm tabular-nums text-ink">
                                    <span className="min-w-0 truncate">{formatPhone(guest.phone)}</span>
                                    <span className="flex shrink-0 gap-3">
                                      <button
                                        type="button"
                                        onClick={() => openPhoneEditor(guest)}
                                        className="font-serif text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint underline underline-offset-4 transition-colors hover:text-ink"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removePhone(guest)}
                                        className="font-serif text-[0.6rem] uppercase tracking-[0.2em] text-red-700/70 underline underline-offset-4 transition-colors hover:text-red-700"
                                      >
                                        Eliminar
                                      </button>
                                    </span>
                                  </p>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openPhoneEditor(guest)}
                                    className="mt-1 inline-flex items-center gap-1.5 font-serif text-sm italic text-ink-faint underline underline-offset-4 transition-colors hover:text-ink"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Añadir teléfono
                                  </button>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(guest.id)}
                                  className="flex-1 rounded-full border border-ink/20 py-2.5 font-serif text-[0.65rem] uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-ivory"
                                >
                                  {copiedId === guest.id ? (
                                    <span className="inline-flex items-center justify-center gap-2">
                                      <Check className="h-3.5 w-3.5" />
                                      Enlace copiado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center gap-2">
                                      <Copy className="h-3.5 w-3.5" />
                                      Copiar invitación
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeGuest(guest)}
                                  aria-label="Eliminar invitado"
                                  className="inline-flex w-11 shrink-0 items-center justify-center rounded-full border border-red-700/25 text-red-700/70 transition-colors hover:border-red-700/60 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </Collapse>
                        </motion.li>
                      )
                    })}
                  </ul>
                )}

                <section aria-label="Restaurar lista" className="mt-10 border-t border-ink/10 pt-6">
                  <p className={labelClasses}>Restaurar lista desde archivo</p>
                  <p className="mt-1 font-serif text-xs italic text-ink-soft">
                    Reemplaza todos los invitados actuales por el contenido de un
                    <code className="mx-1 font-serif">invitados.json</code>. Se usa una sola vez para
                    migrar los datos de Supabase.
                  </p>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImportFile(file)
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    className="mt-3 w-full rounded-full border border-ink/20 py-2.5 font-serif text-[0.65rem] uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-ivory"
                  >
                    Importar invitados.json
                  </button>
                  {importMessage && (
                    <p
                      className={`mt-2 font-serif text-sm ${
                        importMessage.type === 'success' ? 'text-brass' : 'text-red-700/80'
                      }`}
                    >
                      {importMessage.text}
                    </p>
                  )}
                </section>
                </motion.div>
          </>
        )}
      </main>

      <AnimatePresence mode="popLayout">
        {!loading && !addSheetOpen && (
          <motion.button
            key="fab-invitado"
            type="button"
            onClick={() => {
              setMessage(null)
              setAddSheetOpen(true)
            }}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.9 }}
            transition={SPRING_SOFT}
            whileTap={{ scale: 0.94 }}
            className={fabClasses}
          >
            <Plus className="h-4 w-4" />
            Invitado
          </motion.button>
        )}

      </AnimatePresence>

      <Dialog open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent
          onCloseRequest={() => setAddSheetOpen(false)}
          className="bg-ivory text-ink ring-ink/10"
        >
          <DialogTitle className="font-serif text-xl font-light tracking-[-0.01em]">
            Agregar invitado
          </DialogTitle>
          <p className="font-serif text-xs italic text-ink-soft">
            Se envía el enlace personalizado al invitado para su invitación.
          </p>

          <form onSubmit={handleAddGuest} className="-mx-1 flex flex-col gap-5 overflow-y-auto px-1 pb-1">
            <label className="block">
              <span className={labelClasses}>Nombre completo *</span>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="María Pérez"
                className={inputClasses}
              />
            </label>
            <label className="block">
              <span className={labelClasses}>Correo electrónico *</span>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="maria@correo.com"
                className={inputClasses}
              />
            </label>
            <label className="block">
              <span className={labelClasses}>Acompañantes</span>
              <input
                type="text"
                inputMode="numeric"
                value={formData.plus_ones}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 3)
                  setFormData({ ...formData, plus_ones: value })
                }}
                placeholder="0"
                className={inputClasses}
              />
            </label>
            <div className="flex flex-col justify-center">
              <span className={labelClasses}>Sexo</span>
              <div className="mt-2 flex gap-2">
                {(['female', 'male'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: formData.gender === value ? '' : value })}
                    className={`flex-1 rounded-full border px-4 py-2.5 font-serif text-[0.65rem] uppercase tracking-[0.2em] transition-colors ${
                      formData.gender === value
                        ? 'border-ink bg-ink text-ivory'
                        : 'border-ink/20 text-ink-faint hover:border-ink/50 hover:text-ink'
                    }`}
                  >
                    {value === 'female' ? 'Mujer' : 'Hombre'}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_godparent}
                onChange={(e) => setFormData({ ...formData, is_godparent: e.target.checked })}
                className="h-4 w-4 border-ink/30 accent-brass"
              />
              <span className="font-serif text-sm text-ink">Es padrino/madrina</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_courtesy}
                onChange={(e) => setFormData({ ...formData, is_courtesy: e.target.checked })}
                className="h-4 w-4 border-ink/30 accent-brass"
              />
              <span className="font-serif text-sm text-ink">Invitación de cortesía</span>
            </label>
            {formData.is_courtesy && (
              <label className="block">
                <span className={labelClasses}>Acompañantes que asisten</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.courtesy_plus_ones}
                  onChange={(e) => {
                    const max = parseInt(formData.plus_ones) || 0
                    const value = Math.min(parseInt(e.target.value.replace(/\D/g, '')) || 0, max).toString()
                    setFormData({ ...formData, courtesy_plus_ones: value })
                  }}
                  placeholder="0"
                  className={inputClasses}
                />
                <span className="mt-1 block font-serif text-xs italic text-ink-faint">
                  Cuántos de los acompañantes de arriba sí asistirán (máx. {formData.plus_ones || '0'}).
                </span>
              </label>
            )}
            {message && (
              <div
                className={`border px-4 py-3 font-serif text-sm ${
                  message.type === 'success'
                    ? 'border-brass/40 bg-brass/10 text-brass'
                    : 'border-red-700/25 bg-red-700/10 text-red-700/80'
                }`}
              >
                {message.text}
              </div>
            )}

            <Tappable
              type="submit"
              className="w-full rounded-full border border-ink bg-ink py-3 font-serif text-sm uppercase tracking-[0.25em] text-ivory"
            >
              Agregar invitado
            </Tappable>
          </form>
        </SheetContent>
      </Dialog>

    </div>
    </MotionConfig>
  )
}
