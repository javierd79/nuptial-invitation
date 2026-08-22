'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { getUserWithRole, type AuthUser } from '@/lib/auth'
import { Bell, BellRing, Check, ChevronDown, Copy, LogOut, Map, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { formatBs, formatPhone, formatUsd, formatUsdt, formatVzAmount, parseVzAmount } from '@/lib/format'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog'
import { Collapse, SPRING_SOFT, Tappable } from '@/components/motion'
import { useGuestChangeNotifications } from '@/lib/use-guest-change-notifications'
import ToastStack from '@/components/ToastStack'
import ChatButton from '@/components/ChatButton'

interface Guest {
  id: string
  full_name: string
  email: string
  plus_ones: number
  is_courtesy: boolean
  courtesy_plus_ones: number
  gift_description: string | null
  gift_type: string | null
  gift_amount_usd: number | null
  gift_amount_bs: number | null
  is_godparent: boolean
  is_attending: boolean | null
  gender: string | null
  phone: string | null
  created_at: string
  updated_at: string | null
}

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

interface ReceivedGift {
  id: string
  guest_id: string | null
  guest?: { full_name: string } | null
  gift_type: string | null
  description: string | null
  amount_usd: number | null
  amount_bs: number | null
  notes: string | null
  received_at: string | null
  created_at: string
}

const GIFT_TYPES = [
  { value: 'fisico', label: 'Físico' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'pago_movil', label: 'Pago móvil' },
  { value: 'binance', label: 'Binance' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'otro', label: 'Otro' },
]

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

type RealtimeStatus = 'connecting' | 'live' | 'offline'

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

const formatReceivedDate = (iso: string | null) =>
  iso ? formatDate(iso) : '—'

const giftTypeLabel = (value: string | null) =>
  GIFT_TYPES.find((t) => t.value === value)?.label ?? value ?? '—'

export default function AdminDashboard() {
  const router = useRouter()
  const [guests, setGuests] = useState<Guest[]>([])
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS)
  const [loading, setLoading] = useState(true)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    plus_ones: '0',
    gift_description: '',
    is_godparent: false,
    is_courtesy: false,
    courtesy_plus_ones: '0',
    gender: '',
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [gifts, setGifts] = useState<ReceivedGift[]>([])
  const [giftForm, setGiftForm] = useState({
    guest_id: '',
    gift_type: 'fisico',
    description: '',
    amount_usd: '',
    amount_bs: '',
    notes: '',
    received_at: '',
  })
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null)
  const [giftMessage, setGiftMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [activeTab, setActiveTab] = useState('invitados')
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [giftSheetOpen, setGiftSheetOpen] = useState(false)
  const [phoneEditorId, setPhoneEditorId] = useState<string | null>(null)
  const [phoneDraft, setPhoneDraft] = useState<PhoneDraft>(EMPTY_PHONE_DRAFT)

  const { toasts, dismissToast, permission, requestPermission } = useGuestChangeNotifications({
    guests,
    role: user?.role ?? null,
  })

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
    const supabase = createClient()
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading guests:', error)
      return
    }

    setGuests(data || [])
    calculateMetrics(data || [])
  }, [])

  const loadGifts = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('received_gifts')
      .select('*, guests(full_name)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading gifts:', error)
      return
    }

    setGifts((data as ReceivedGift[]) || [])
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

      const authUser = await getUserWithRole(supabase)

      if (!authUser) {
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }

      if (authUser.role !== 'ADMIN') {
        router.push('/admin/protocol')
        return
      }

      if (!mounted) return
      setUser(authUser)

      await Promise.all([loadGuests(), loadGifts()])
      if (!mounted) return
      setLoading(false)

      const channel = supabase
        .channel('guests-realtime')
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

      const giftsChannel = supabase
        .channel('gifts-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'received_gifts' },
          () => {
            loadGifts()
          },
        )
        .subscribe()

      return [channel, giftsChannel]
    }

    const channelsPromise = init()

    return () => {
      mounted = false
      channelsPromise.then((channels) => {
        channels?.forEach((channel) => supabase.removeChannel(channel))
      })
    }
  }, [loadGuests, loadGifts, router])

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.full_name.trim() === '' || formData.email.trim() === '') {
      setMessage({ type: 'error', text: 'Nombre y correo son obligatorios.' })
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from('guests').insert([
        {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          plus_ones: parseInt(formData.plus_ones) || 0,
          gift_description: formData.gift_description.trim() || null,
          is_godparent: formData.is_godparent,
          is_courtesy: formData.is_courtesy,
          courtesy_plus_ones: formData.is_courtesy ? parseInt(formData.courtesy_plus_ones) || 0 : 0,
          gender: formData.gender || null,
        },
      ])

      if (error) {
        setMessage({ type: 'error', text: `No se pudo agregar: ${error.message}` })
      } else {
        setMessage(null)
        setFormData({
          full_name: '',
          email: '',
          plus_ones: '0',
          gift_description: '',
          is_godparent: false,
          is_courtesy: false,
          courtesy_plus_ones: '0',
          gender: '',
        })
        setAddSheetOpen(false)
        loadGuests()
      }
    } catch (error) {
      console.error('Error adding guest:', error)
      setMessage({ type: 'error', text: 'Error al agregar el invitado.' })
    }
  }

  const resetGiftForm = () => {
    setGiftForm({
      guest_id: '',
      gift_type: 'fisico',
      description: '',
      amount_usd: '',
      amount_bs: '',
      notes: '',
      received_at: '',
    })
    setEditingGiftId(null)
    setGiftMessage(null)
  }

  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!giftForm.description.trim() && !giftForm.amount_usd && !giftForm.amount_bs) {
      setGiftMessage({ type: 'error', text: 'Agrega al menos una descripción o un monto.' })
      return
    }

    const payload = {
      guest_id: giftForm.guest_id || null,
      gift_type: giftForm.gift_type,
      description: giftForm.description.trim() || null,
      amount_usd: parseVzAmount(giftForm.amount_usd) || null,
      amount_bs: parseVzAmount(giftForm.amount_bs) || null,
      notes: giftForm.notes.trim() || null,
      received_at: giftForm.received_at || null,
    }

    try {
      const supabase = createClient()
      const { error } = editingGiftId
        ? await supabase.from('received_gifts').update(payload).eq('id', editingGiftId)
        : await supabase.from('received_gifts').insert([payload])

      if (error) {
        setGiftMessage({ type: 'error', text: `No se pudo guardar: ${error.message}` })
      } else {
        resetGiftForm()
        setGiftSheetOpen(false)
        loadGifts()
      }
    } catch (error) {
      console.error('Error saving gift:', error)
      setGiftMessage({ type: 'error', text: 'Error al guardar el regalo.' })
    }
  }

  const handleEditGift = (gift: ReceivedGift) => {
    setEditingGiftId(gift.id)
    setGiftForm({
      guest_id: gift.guest_id ?? '',
      gift_type: gift.gift_type ?? 'fisico',
      description: gift.description ?? '',
      amount_usd: gift.amount_usd != null ? formatVzAmount(String(gift.amount_usd)) : '',
      amount_bs: gift.amount_bs != null ? formatVzAmount(String(gift.amount_bs)) : '',
      notes: gift.notes ?? '',
      received_at: gift.received_at ?? '',
    })
    setGiftMessage(null)
    setGiftSheetOpen(true)
  }

  const handleDeleteGift = async (id: string) => {
    if (!window.confirm('¿Eliminar este regalo recibido?')) return

    const supabase = createClient()
    const { error } = await supabase.from('received_gifts').delete().eq('id', id)

    if (error) {
      console.error('Error deleting gift:', error)
      setGiftMessage({ type: 'error', text: 'No se pudo eliminar el regalo.' })
    } else {
      setGiftMessage({ type: 'success', text: 'Regalo eliminado.' })
      if (editingGiftId === id) resetGiftForm()
      loadGifts()
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
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

    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, courtesy_plus_ones: next } : g)),
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('guests')
      .update({ courtesy_plus_ones: next })
      .eq('id', guest.id)

    if (error) {
      console.error('Error updating courtesy plus ones:', error)
      loadGuests()
    }
  }

  const updateCourtesyStatus = async (guest: Guest, isCourtesy: boolean) => {
    const courtesyPlusOnes = isCourtesy ? guest.courtesy_plus_ones : 0

    setGuests((prev) =>
      prev.map((g) =>
        g.id === guest.id ? { ...g, is_courtesy: isCourtesy, courtesy_plus_ones: courtesyPlusOnes } : g,
      ),
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('guests')
      .update({ is_courtesy: isCourtesy, courtesy_plus_ones: courtesyPlusOnes })
      .eq('id', guest.id)

    if (error) {
      console.error('Error updating courtesy status:', error)
      loadGuests()
    }
  }

  const updateGender = async (guest: Guest, gender: string) => {
    const next = guest.gender === gender ? null : gender

    setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, gender: next } : g)))

    const supabase = createClient()
    const { error } = await supabase.from('guests').update({ gender: next }).eq('id', guest.id)

    if (error) {
      console.error('Error updating gender:', error)
      loadGuests()
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

    setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, phone } : g)))
    closePhoneEditor()

    const supabase = createClient()
    const { error } = await supabase.from('guests').update({ phone }).eq('id', guest.id)

    if (error) {
      console.error('Error updating guest phone:', error)
      loadGuests()
    }
  }

  const removePhone = async (guest: Guest) => {
    setGuests((prev) => prev.map((g) => (g.id === guest.id ? { ...g, phone: null } : g)))
    if (phoneEditorId === guest.id) closePhoneEditor()

    const supabase = createClient()
    const { error } = await supabase.from('guests').update({ phone: null }).eq('id', guest.id)

    if (error) {
      console.error('Error removing guest phone:', error)
      loadGuests()
    }
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

  const giftTotals = useMemo(
    () => ({
      count: gifts.length,
      sum_usd: gifts.reduce((sum, g) => sum + (g.amount_usd ?? 0), 0),
      sum_bs: gifts.reduce((sum, g) => sum + (g.amount_bs ?? 0), 0),
    }),
    [gifts],
  )

  const declaredWithoutRecord = useMemo(() => {
    const recordedIds = new Set(gifts.map((g) => g.guest_id).filter((id): id is string => Boolean(id)))
    return guests.filter((g) => (g.gift_type != null || g.gift_description) && !recordedIds.has(g.id))
  }, [gifts, guests])

  const inputClasses =
    'mt-2 w-full border-b border-ink/20 bg-transparent pb-2 font-serif text-lg font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none'
  const selectClasses =
    'mt-2 w-full border-b border-ink/20 bg-transparent pb-2 font-serif text-lg font-light text-ink focus:border-brass focus:outline-none'
  const phoneFieldClasses =
    'min-w-0 flex-1 border-b border-ink/20 bg-transparent pb-2 font-serif text-base font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none'
  const phoneSelectClasses =
    'border-b border-ink/20 bg-transparent pb-2 font-serif text-base font-light text-ink focus:border-brass focus:outline-none'
  const labelClasses = 'font-serif text-[0.6rem] uppercase tracking-[0.25em] text-ink-faint'
  const cardClasses = 'rounded-2xl border border-ink/10 bg-ivory-deep/40 p-4'
  const counterClasses =
    'rounded-xl border border-ink/10 bg-ivory-deep/40 px-3 py-2.5 text-center'
  const tabTriggerClasses =
    'h-auto w-full py-3 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint data-active:text-ink data-active:after:bg-brass hover:text-yellow-400'
  const fabClasses =
    'fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-brass bg-brass px-6 py-3 font-serif text-xs uppercase tracking-[0.25em] text-ivory shadow-lg shadow-ink/15 transition-colors hover:bg-brass/90'

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-ivory text-ink">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />

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
              aria-label="Estado de conexión"
              title={
                realtimeStatus === 'live'
                  ? 'En vivo'
                  : realtimeStatus === 'offline'
                    ? 'Sin conexión'
                    : 'Conectando'
              }
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                realtimeStatus === 'live'
                  ? 'bg-brass'
                  : realtimeStatus === 'offline'
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
              onClick={() => router.push('/admin/seating')}
              aria-label="Plano del salón"
              title="Plano del salón"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-ivory"
            >
              <Map className="h-4 w-4" />
            </button>
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
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  permission === 'granted'
                    ? 'border-brass bg-brass/10 text-brass'
                    : 'border-ink/30 text-ink hover:bg-ink hover:text-ivory disabled:cursor-not-allowed disabled:opacity-40'
                }`}
              >
                {permission === 'granted' ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={loadGuests}
              aria-label="Refrescar invitados"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-ivory"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-ivory"
            >
              <LogOut className="h-4 w-4" />
            </button>
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

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(String(value))} className="mt-6">
              <TabsList variant="line" className="mb-5 grid h-auto w-full grid-cols-2">
                <TabsTrigger value="invitados" className={tabTriggerClasses}>
                  Invitados
                </TabsTrigger>
                <TabsTrigger value="regalos" className={tabTriggerClasses}>
                  Regalos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="invitados" className="focus:outline-none pb-24">
                <motion.div
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
                                <p className="break-all font-serif text-xs text-ink-soft">{guest.email}</p>
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

                              <button
                                type="button"
                                onClick={() => copyToClipboard(guest.id)}
                                className="w-full rounded-full border border-ink/20 py-2.5 font-serif text-[0.65rem] uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-ivory"
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
                            </div>
                          </Collapse>
                        </motion.li>
                      )
                    })}
                  </ul>
                )}
                </motion.div>
              </TabsContent>

              <TabsContent value="regalos" className="focus:outline-none pb-24">
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                <section aria-label="Resumen de regalos recibidos">
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`${counterClasses} border-brass/30 bg-brass/10`}>
                      <p className="font-serif text-2xl font-light tabular-nums text-brass">{giftTotals.count}</p>
                      <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                        Recibidos
                      </p>
                    </div>
                    <div className={counterClasses}>
                      <p className="font-serif text-lg font-light tabular-nums">{formatUsd(giftTotals.sum_usd)}</p>
                      <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                        Total USD
                      </p>
                    </div>
                    <div className={counterClasses}>
                      <p className="font-serif text-lg font-light tabular-nums">{formatBs(giftTotals.sum_bs)}</p>
                      <p className="mt-0.5 font-serif text-[0.55rem] uppercase tracking-[0.2em] text-ink-faint">
                        Total Bs.
                      </p>
                    </div>
                  </div>
                </section>

                {gifts.length === 0 ? (
                  <p className="py-12 text-center font-serif text-sm italic text-ink-soft">
                    Aún no hay regalos registrados.
                  </p>
                ) : (
                  <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
                    {gifts.map((gift) => (
                      <motion.li
                        key={gift.id}
                        layout
                        transition={SPRING_SOFT}
                        className={cardClasses}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-serif text-lg font-light">
                              {gift.guest?.full_name ?? 'Sin vincular'}
                            </p>
                            {gift.notes && (
                              <p className="mt-0.5 font-serif text-xs italic text-ink-faint">{gift.notes}</p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full border border-brass/40 bg-brass/5 px-3 py-1 font-serif text-[0.6rem] uppercase tracking-[0.2em] text-brass">
                            {giftTypeLabel(gift.gift_type)}
                          </span>
                        </div>

                        {gift.description && (
                          <p className="mt-2 font-serif text-sm font-light text-ink-soft">{gift.description}</p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2 rounded-full border border-ink/10 px-4 py-2 font-serif text-sm tabular-nums">
                          <span>{gift.amount_usd != null ? formatUsd(gift.amount_usd) : '—'}</span>
                          <span className="text-ink-soft">{gift.amount_bs != null ? formatBs(gift.amount_bs) : '—'}</span>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-serif text-[0.65rem] italic text-ink-faint">
                            {formatReceivedDate(gift.received_at)}
                          </span>
                          <span className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditGift(gift)}
                              aria-label="Editar regalo"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-ink-soft transition-colors hover:border-ink/50 hover:text-ink"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGift(gift.id)}
                              aria-label="Eliminar regalo"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-700/25 text-red-700/70 transition-colors hover:border-red-700/60 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                )}

                {declaredWithoutRecord.length > 0 && (
                  <section className="mt-8" aria-label="Declarados sin registrar">
                    <h2 className="font-serif text-xl font-light text-ink">Declarados sin registrar</h2>
                    <p className="mt-1 font-serif text-xs italic text-ink-soft">
                      Declararon un regalo en su invitación pero aún no aparece en el registro recibido.
                    </p>
                    <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
                      {declaredWithoutRecord.map((guest) => {
                        const declared = giftFor(guest)
                        return (
                          <li key={guest.id} className={cardClasses}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-serif text-base font-light">{guest.full_name}</p>
                                {declared && (
                                  <p className="mt-0.5 truncate font-serif text-xs italic text-ink-faint">
                                    {declared.label}: {declared.value}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGiftId(null)
                                  setGiftForm((prev) => ({
                                    ...prev,
                                    guest_id: guest.id,
                                    gift_type: guest.gift_type ?? 'fisico',
                                    description:
                                      guest.gift_type === 'fisico' ? (guest.gift_description ?? '') : '',
                                    amount_usd:
                                      guest.gift_amount_usd != null
                                        ? formatVzAmount(String(guest.gift_amount_usd))
                                        : '',
                                    amount_bs:
                                      guest.gift_amount_bs != null
                                        ? formatVzAmount(String(guest.gift_amount_bs))
                                        : '',
                                  }))
                                  setGiftMessage(null)
                                  setGiftSheetOpen(true)
                                }}
                                className="shrink-0 rounded-full border border-ink/30 px-4 py-2 font-serif text-[0.6rem] uppercase tracking-[0.2em] text-ink transition-colors hover:bg-ink hover:text-ivory"
                              >
                                Registrar
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <AnimatePresence mode="popLayout">
        {!loading && activeTab === 'invitados' && !addSheetOpen && (
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

        {!loading && activeTab === 'regalos' && !giftSheetOpen && (
          <motion.button
            key="fab-regalo"
            type="button"
            onClick={() => {
              resetGiftForm()
              setGiftSheetOpen(true)
            }}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.9 }}
            transition={SPRING_SOFT}
            whileTap={{ scale: 0.94 }}
            className={fabClasses}
          >
            <Plus className="h-4 w-4" />
            Regalo
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
            <label className="block">
              <span className={labelClasses}>Nota del regalo</span>
              <textarea
                value={formData.gift_description}
                onChange={(e) => setFormData({ ...formData, gift_description: e.target.value })}
                rows={2}
                placeholder="Idealmente se asigna desde la invitación."
                className="mt-2 w-full resize-none border-b border-ink/20 bg-transparent pb-2 font-serif text-base font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none"
              />
            </label>

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

      <Dialog open={giftSheetOpen} onOpenChange={setGiftSheetOpen}>
        <SheetContent
          onCloseRequest={() => setGiftSheetOpen(false)}
          className="bg-ivory text-ink ring-ink/10"
        >
          <DialogTitle className="font-serif text-xl font-light tracking-[-0.01em]">
            {editingGiftId ? 'Editar regalo recibido' : 'Registrar regalo recibido'}
          </DialogTitle>
          <p className="font-serif text-xs italic text-ink-soft">
            Registra aquí los regalos recibidos el día de la boda.
          </p>

          <form onSubmit={handleSaveGift} className="-mx-1 flex flex-col gap-5 overflow-y-auto px-1 pb-1">
            <label className="block">
              <span className={labelClasses}>Invitado (opcional)</span>
              <select
                value={giftForm.guest_id}
                onChange={(e) => setGiftForm({ ...giftForm, guest_id: e.target.value })}
                className={selectClasses}
              >
                <option value="">Sin vincular</option>
                {guests.map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClasses}>Tipo de regalo</span>
              <select
                value={giftForm.gift_type}
                onChange={(e) => setGiftForm({ ...giftForm, gift_type: e.target.value })}
                className={selectClasses}
              >
                {GIFT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClasses}>Monto en USD</span>
              <input
                type="text"
                inputMode="decimal"
                value={giftForm.amount_usd}
                onChange={(e) => setGiftForm({ ...giftForm, amount_usd: formatVzAmount(e.target.value) })}
                placeholder="0,00"
                className={inputClasses}
              />
            </label>
            <label className="block">
              <span className={labelClasses}>Monto en Bs.</span>
              <input
                type="text"
                inputMode="decimal"
                value={giftForm.amount_bs}
                onChange={(e) => setGiftForm({ ...giftForm, amount_bs: formatVzAmount(e.target.value) })}
                placeholder="0,00"
                className={inputClasses}
              />
            </label>
            <label className="block">
              <span className={labelClasses}>Fecha recibido</span>
              <input
                type="date"
                value={giftForm.received_at}
                onChange={(e) => setGiftForm({ ...giftForm, received_at: e.target.value })}
                className={inputClasses}
              />
            </label>
            <label className="block">
              <span className={labelClasses}>Notas</span>
              <input
                type="text"
                value={giftForm.notes}
                onChange={(e) => setGiftForm({ ...giftForm, notes: e.target.value })}
                placeholder="Ej. lo entregó en mano"
                className={inputClasses}
              />
            </label>
            <label className="block">
              <span className={labelClasses}>Descripción</span>
              <textarea
                value={giftForm.description}
                onChange={(e) => setGiftForm({ ...giftForm, description: e.target.value })}
                rows={2}
                placeholder="Ej. Juego de copas de cristal"
                className="mt-2 w-full resize-none border-b border-ink/20 bg-transparent pb-2 font-serif text-base font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none"
              />
            </label>

            {giftMessage && (
              <div
                className={`border px-4 py-3 font-serif text-sm ${
                  giftMessage.type === 'success'
                    ? 'border-brass/40 bg-brass/10 text-brass'
                    : 'border-red-700/25 bg-red-700/10 text-red-700/80'
                }`}
              >
                {giftMessage.text}
              </div>
            )}

            <div className="flex gap-3">
              <Tappable
                type="submit"
                className="flex-1 rounded-full border border-ink bg-ink py-3 font-serif text-sm uppercase tracking-[0.25em] text-ivory"
              >
                {editingGiftId ? 'Guardar cambios' : 'Registrar regalo'}
              </Tappable>
              <Tappable
                type="button"
                onClick={() => {
                  resetGiftForm()
                  setGiftSheetOpen(false)
                }}
                className="rounded-full border border-ink/30 px-6 py-3 font-serif text-sm uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-ivory"
              >
                Cancelar
              </Tappable>
            </div>
          </form>
        </SheetContent>
      </Dialog>
    </div>
    </MotionConfig>
  )
}
