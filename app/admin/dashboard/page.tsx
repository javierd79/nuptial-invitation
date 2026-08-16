'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Copy, Gift, LogOut, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { formatBs, formatUsd, formatUsdt, formatVzAmount, parseVzAmount } from '@/lib/format'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
        setMessage({ type: 'success', text: 'Invitado agregado correctamente.' })
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
        setGiftMessage({
          type: 'success',
          text: editingGiftId ? 'Regalo actualizado correctamente.' : 'Regalo registrado correctamente.',
        })
        resetGiftForm()
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
  const labelClasses = 'font-serif text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint'
  const panelClasses = 'rounded-2xl border border-ink/10 bg-ivory-deep/40'

  return (
    <div className="min-h-screen bg-ivory text-ink">
      {/* Header */}
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div>
            <h1 className="font-serif text-3xl font-light tracking-[-0.01em] text-ink md:text-4xl">
              Panel de invitados
            </h1>
            <p className="mt-2 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
              Javier &amp; Maria · 12 de septiembre de 2026
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 font-serif text-[0.65rem] uppercase tracking-[0.3em] ${
                realtimeStatus === 'live' ? 'text-brass' : realtimeStatus === 'offline' ? 'text-red-700/70' : 'text-ink-faint'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  realtimeStatus === 'live' ? 'bg-brass' : realtimeStatus === 'offline' ? 'bg-red-700/70' : 'bg-ink-faint animate-pulse'
                }`}
              />
              {realtimeStatus === 'live' ? 'En vivo' : realtimeStatus === 'offline' ? 'Sin conexión' : 'Conectando'}
            </span>
            <button
              type="button"
              onClick={loadGuests}
              aria-label="Refrescar invitados"
              className="inline-flex items-center gap-2 border border-ink/30 px-4 py-2.5 font-serif text-xs uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-ivory"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refrescar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 border border-ink/30 px-4 py-2.5 font-serif text-xs uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-ivory"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <Tabs defaultValue="invitados">
          <TabsList variant="line" className="mb-10 h-auto w-fit border-b border-ink/10">
            <TabsTrigger
              value="invitados"
              className="h-auto px-8 py-3 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint data-active:text-ink data-active:after:bg-brass hover:text-yellow-400 hover:cursor-pointer"
            >
              Invitados
            </TabsTrigger>
            <TabsTrigger
              value="regalos"
              className="h-auto px-8 py-3 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint data-active:text-ink data-active:after:bg-brass hover:text-yellow-400 hover:cursor-pointer"
            >
              Regalos recibidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invitados" className="focus:outline-none">
        {/* Metrics */}
        <section aria-label="Métricas de invitados">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <div className="rounded-2xl border border-ink/10 bg-ivory-deep/60 p-6">
              <p className={labelClasses}>Invitados</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-ink">{metrics.total_guests}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-ivory-deep/60 p-6">
              <p className={labelClasses}>Acompañantes</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-ink">{metrics.total_plus_ones}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-ivory-deep/60 p-6">
              <p className={labelClasses}>Asistentes estimados</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-ink">{metrics.estimated_attendees}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-ivory-deep/60 p-6">
              <p className={labelClasses}>Confirmados</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-brass">{metrics.confirmed}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-ivory-deep/60 p-6">
              <p className={labelClasses}>Rechazó</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-red-700/70">{metrics.declined}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-ivory-deep/60 p-6">
              <p className={labelClasses}>Pendientes</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-ink-soft">{metrics.pending}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-ink/10 bg-ivory-deep/40 p-6">
              <p className={labelClasses}>Invitaciones de cortesía</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-ink">{metrics.courtesy}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-ivory-deep/40 p-6">
              <p className={labelClasses}>Acompañantes de cortesía que asisten</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-ink">{metrics.courtesy_attending}</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-ivory-deep/40 p-6">
              <p className={labelClasses}>Padrinos</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-ink">{metrics.godparents}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-brass/30 bg-brass/5 p-6">
              <p className={labelClasses}>Regalos registrados</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-brass">{metrics.gift_count}</p>
            </div>
            <div className="rounded-2xl border border-brass/30 bg-brass/5 p-6">
              <p className={labelClasses}>Total en USD</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-brass">{formatUsd(metrics.sum_usd)}</p>
            </div>
            <div className="rounded-2xl border border-brass/30 bg-brass/5 p-6">
              <p className={labelClasses}>Total en Bs.</p>
              <p className="mt-2 font-serif text-3xl font-light tabular-nums text-brass">{formatBs(metrics.sum_bs)}</p>
            </div>
          </div>
        </section>

        {/* Add guest */}
        <section className={`${panelClasses} mb-12 mt-12 p-8`}>
          <h2 className="font-serif text-2xl font-light text-ink">Agregar invitado</h2>
          <p className="mt-2 font-serif text-sm italic text-ink-soft">
            Se envía el enlace personalizado al invitado para su invitación.
          </p>

          <form onSubmit={handleAddGuest} className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
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
            <label className="flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                checked={formData.is_godparent}
                onChange={(e) => setFormData({ ...formData, is_godparent: e.target.checked })}
                className="h-4 w-4 border-ink/30 accent-brass"
              />
              <span className="font-serif text-sm uppercase tracking-[0.25em] text-ink">Es padrino/madrina</span>
            </label>
            <div className="flex flex-col justify-center pt-4">
              <span className="font-serif text-xs uppercase tracking-[0.25em] text-ink-faint">Sexo</span>
              <div className="mt-2 flex gap-3">
                {(['female', 'male'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: formData.gender === value ? '' : value })}
                    className={`border px-4 py-1.5 font-serif text-sm uppercase tracking-[0.2em] transition-colors ${
                      formData.gender === value
                        ? 'border-ink bg-ink text-ivory'
                        : 'border-ink/20 text-ink-soft hover:border-ink/50 hover:text-ink'
                    }`}
                  >
                    {value === 'female' ? 'Mujer' : 'Hombre'}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                checked={formData.is_courtesy}
                onChange={(e) => setFormData({ ...formData, is_courtesy: e.target.checked })}
                className="h-4 w-4 border-ink/30 accent-brass"
              />
              <span className="font-serif text-sm uppercase tracking-[0.25em] text-ink">Invitación de cortesía</span>
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
            <label className="block md:col-span-2">
              <span className={labelClasses}>Nota del regalo</span>
              <textarea
                value={formData.gift_description}
                onChange={(e) => setFormData({ ...formData, gift_description: e.target.value })}
                rows={2}
                placeholder="Idealmente se asigna desde la invitación."
                className="mt-2 w-full resize-none border-b border-ink/20 bg-transparent pb-2 font-serif text-lg font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none"
              />
            </label>

            {message && (
              <div
                className={`md:col-span-2 border px-5 py-4 font-serif text-sm ${
                  message.type === 'success'
                    ? 'border-brass/40 bg-brass/10 text-brass'
                    : 'border-red-700/25 bg-red-700/10 text-red-700/80'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 border border-ink bg-ink px-8 py-3 font-serif text-sm uppercase tracking-[0.25em] text-ivory transition-colors hover:bg-ink/90"
              >
                <Plus className="h-4 w-4" />
                Agregar invitado
              </button>
            </div>
          </form>
        </section>

        {/* Guests table */}
        <section className="overflow-hidden rounded-2xl border border-ink/10 bg-ivory-deep/40">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 p-8">
            <div>
              <h2 className="font-serif text-2xl font-light text-ink">Invitados</h2>
              <p className="mt-1 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
                {filteredGuests.length} de {guests.length} invitados
              </p>
            </div>
            <label className="flex items-center gap-3 border-b border-ink/20 pb-1 focus-within:border-brass">
              <Search className="h-4 w-4 text-ink-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o correo"
                className="w-56 bg-transparent font-serif text-sm font-light text-ink placeholder:text-ink/30 focus:outline-none"
              />
            </label>
          </div>

          {loading ? (
            <div className="p-12 text-center font-serif text-sm italic text-ink-soft">
              Cargando invitados…
            </div>
          ) : guests.length === 0 ? (
            <div className="p-12 text-center font-serif text-sm italic text-ink-soft">
              Aún no hay invitados.
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="p-12 text-center font-serif text-sm italic text-ink-soft">
              Ningún invitado coincide con la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-ink/10 bg-ivory-deep/60">
                  <tr>
                    <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Estado</th>
                    <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Nombre</th>
                   <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Correo</th>
                    <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Acompañantes</th>
                    <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Rol</th>
                    <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Regalo</th>
                    <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Registrado</th>
                    <th className={`${labelClasses} px-6 py-3 text-right font-normal`}>Invitación</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((guest) => {
                    const gift = giftFor(guest)
                    const status = statusFor(guest)
                    return (
                      <tr key={guest.id} className="border-b border-ink/10 transition-colors hover:bg-ivory-deep/40">
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block rounded-full border px-3 py-1 font-serif text-[0.65rem] uppercase tracking-[0.2em] ${status.className}`}
                          >
                            {status.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCourtesyStatus(guest, !guest.is_courtesy)}
                            className="mt-2 block font-serif text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint underline decoration-ink/25 underline-offset-4 transition-colors hover:text-ink"
                          >
                            {guest.is_courtesy ? 'Quitar cortesía' : 'Marcar como cortesía'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-serif text-base font-light text-ink">{guest.full_name}</p>
                          <p className="mt-0.5 font-serif text-xs italic text-ink-faint">{formatDate(guest.created_at)}</p>
                          <div className="mt-2 flex gap-2">
                            {(['female', 'male'] as const).map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => updateGender(guest, value)}
                                className={`border px-2.5 py-0.5 font-serif text-[0.65rem] uppercase tracking-[0.15em] transition-colors ${
                                  guest.gender === value
                                    ? 'border-ink bg-ink text-ivory'
                                    : 'border-ink/20 text-ink-faint hover:border-ink/50 hover:text-ink'
                                }`}
                              >
                                {value === 'female' ? 'Mujer' : 'Hombre'}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-serif text-sm font-light text-ink-soft">{guest.email}</td>
                        <td className="px-6 py-4">
                          <p className="font-serif text-sm tabular-nums text-ink">{guest.plus_ones}</p>
                          {guest.is_courtesy && (
                            <div className="mt-2">
                              <p className="font-serif text-[0.65rem] uppercase tracking-[0.25em] text-ink-faint">
                                Que asisten
                              </p>
                              <div className="mt-1.5 inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  aria-label="Quitar un acompañante que asiste"
                                  onClick={() => updateCourtesyPlusOnes(guest, guest.courtesy_plus_ones - 1)}
                                  disabled={guest.courtesy_plus_ones <= 0}
                                  className="flex h-6 w-6 items-center justify-center border border-ink/20 font-serif text-sm text-ink transition-colors hover:border-ink/50 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center font-serif text-sm tabular-nums text-ink">
                                  {guest.courtesy_plus_ones}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Agregar un acompañante que asiste"
                                  onClick={() => updateCourtesyPlusOnes(guest, guest.courtesy_plus_ones + 1)}
                                  disabled={guest.courtesy_plus_ones >= guest.plus_ones}
                                  className="flex h-6 w-6 items-center justify-center border border-ink/20 font-serif text-sm text-ink transition-colors hover:border-ink/50 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {guest.is_godparent ? (
                            <span className="inline-block rounded-full border border-brass/40 px-3 py-1 font-serif text-[0.65rem] uppercase tracking-[0.2em] text-brass">
                              {guest.gender === 'female' ? 'Madrina' : 'Padrino'}
                            </span>
                          ) : (
                            <span className="font-serif text-sm text-ink-faint">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {gift ? (
                            <div>
                              <p className="font-serif text-[0.65rem] uppercase tracking-[0.25em] text-ink-faint">{gift.label}</p>
                              <p className="mt-1 font-serif text-sm font-light text-ink">{gift.value}</p>
                            </div>
                          ) : (
                            <span className="font-serif text-sm text-ink-faint">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-serif text-sm tabular-nums text-ink-soft">{formatDate(guest.created_at)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(guest.id)}
                            className="inline-flex items-center gap-2 border border-ink/20 px-3 py-1.5 font-serif text-[0.65rem] uppercase tracking-[0.2em] text-ink-soft transition-colors hover:border-ink/50 hover:text-ink"
                          >
                            {copiedId === guest.id ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copiar
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </TabsContent>

          <TabsContent value="regalos" className="focus:outline-none">
            {/* Resumen */}
            <section aria-label="Resumen de regalos recibidos">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-brass/30 bg-brass/5 p-6">
                  <p className={labelClasses}>Regalos recibidos</p>
                  <p className="mt-2 font-serif text-3xl font-light tabular-nums text-brass">{giftTotals.count}</p>
                </div>
                <div className="rounded-2xl border border-brass/30 bg-brass/5 p-6">
                  <p className={labelClasses}>Total en USD</p>
                  <p className="mt-2 font-serif text-3xl font-light tabular-nums text-brass">{formatUsd(giftTotals.sum_usd)}</p>
                </div>
                <div className="rounded-2xl border border-brass/30 bg-brass/5 p-6">
                  <p className={labelClasses}>Total en Bs.</p>
                  <p className="mt-2 font-serif text-3xl font-light tabular-nums text-brass">{formatBs(giftTotals.sum_bs)}</p>
                </div>
              </div>
            </section>

            {/* Formulario */}
            <section className={`${panelClasses} mb-12 mt-12 p-8`}>
              <h2 className="font-serif text-2xl font-light text-ink">
                {editingGiftId ? 'Editar regalo recibido' : 'Registrar regalo recibido'}
              </h2>
              <p className="mt-2 font-serif text-sm italic text-ink-soft">
                Registra aquí los regalos recibidos el día de la boda.
              </p>

              <form onSubmit={handleSaveGift} className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
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
                <label className="block md:col-span-2">
                  <span className={labelClasses}>Descripción</span>
                  <textarea
                    value={giftForm.description}
                    onChange={(e) => setGiftForm({ ...giftForm, description: e.target.value })}
                    rows={2}
                    placeholder="Ej. Juego de copas de cristal"
                    className="mt-2 w-full resize-none border-b border-ink/20 bg-transparent pb-2 font-serif text-lg font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none"
                  />
                </label>

                {giftMessage && (
                  <div
                    className={`md:col-span-2 border px-5 py-4 font-serif text-sm ${
                      giftMessage.type === 'success'
                        ? 'border-brass/40 bg-brass/10 text-brass'
                        : 'border-red-700/25 bg-red-700/10 text-red-700/80'
                    }`}
                  >
                    {giftMessage.text}
                  </div>
                )}

                <div className="flex gap-4 md:col-span-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 border border-ink bg-ink px-8 py-3 font-serif text-sm uppercase tracking-[0.25em] text-ivory transition-colors hover:bg-ink/90"
                  >
                    <Gift className="h-4 w-4" />
                    {editingGiftId ? 'Guardar cambios' : 'Registrar regalo'}
                  </button>
                  {editingGiftId && (
                    <button
                      type="button"
                      onClick={resetGiftForm}
                      className="border border-ink/30 px-8 py-3 font-serif text-sm uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-ivory"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Tabla de regalos */}
            <section className="overflow-hidden rounded-2xl border border-ink/10 bg-ivory-deep/40">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 p-8">
                <div>
                  <h2 className="font-serif text-2xl font-light text-ink">Registros</h2>
                  <p className="mt-1 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
                    {gifts.length} regalos recibidos
                  </p>
                </div>
              </div>

              {gifts.length === 0 ? (
                <div className="p-12 text-center font-serif text-sm italic text-ink-soft">
                  Aún no hay regalos registrados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="border-b border-ink/10 bg-ivory-deep/60">
                      <tr>
                        <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Invitado</th>
                        <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Tipo</th>
                        <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Detalle</th>
                        <th className={`${labelClasses} px-6 py-3 text-right font-normal`}>USD</th>
                        <th className={`${labelClasses} px-6 py-3 text-right font-normal`}>Bs.</th>
                        <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Fecha</th>
                        <th className={`${labelClasses} px-6 py-3 text-right font-normal`}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gifts.map((gift) => (
                        <tr key={gift.id} className="border-b border-ink/10 transition-colors hover:bg-ivory-deep/40">
                          <td className="px-6 py-4">
                            <p className="font-serif text-base font-light text-ink">
                              {gift.guest?.full_name ?? 'Sin vincular'}
                            </p>
                            {gift.notes && (
                              <p className="mt-0.5 font-serif text-xs italic text-ink-faint">{gift.notes}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block rounded-full border border-brass/40 px-3 py-1 font-serif text-[0.65rem] uppercase tracking-[0.2em] text-brass">
                              {giftTypeLabel(gift.gift_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-serif text-sm font-light text-ink-soft">
                            {gift.description ?? '—'}
                          </td>
                          <td className="px-6 py-4 text-right font-serif text-sm tabular-nums text-ink">
                            {gift.amount_usd != null ? formatUsd(gift.amount_usd) : '—'}
                          </td>
                          <td className="px-6 py-4 text-right font-serif text-sm tabular-nums text-ink-soft">
                            {gift.amount_bs != null ? formatBs(gift.amount_bs) : '—'}
                          </td>
                          <td className="px-6 py-4 font-serif text-sm tabular-nums text-ink-soft">
                            {formatReceivedDate(gift.received_at)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditGift(gift)}
                                aria-label="Editar regalo"
                                className="inline-flex h-8 w-8 items-center justify-center border border-ink/20 text-ink-soft transition-colors hover:border-ink/50 hover:text-ink"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGift(gift.id)}
                                aria-label="Eliminar regalo"
                                className="inline-flex h-8 w-8 items-center justify-center border border-red-700/25 text-red-700/70 transition-colors hover:border-red-700/60 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Comparativa */}
            {declaredWithoutRecord.length > 0 && (
              <section className="mt-8 rounded-2xl border border-ink/10 bg-ivory-deep/40 p-8">
                <h2 className="font-serif text-2xl font-light text-ink">Declarados sin registrar</h2>
                <p className="mt-2 font-serif text-sm italic text-ink-soft">
                  Estos invitados declararon un regalo en su invitación pero aún no aparece en el registro recibido.
                </p>
                <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {declaredWithoutRecord.map((guest) => {
                    const declared = giftFor(guest)
                    return (
                      <li
                        key={guest.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-ink/10 bg-ivory-deep/60 px-5 py-4"
                      >
                        <div>
                          <p className="font-serif text-base font-light text-ink">{guest.full_name}</p>
                          {declared && (
                            <p className="mt-0.5 font-serif text-xs italic text-ink-faint">
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
                          }}
                          className="border border-ink/30 px-4 py-2 font-serif text-[0.65rem] uppercase tracking-[0.2em] text-ink transition-colors hover:bg-ink hover:text-ivory"
                        >
                          Registrar
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
