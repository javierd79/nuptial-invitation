'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Copy, LogOut, Plus, RefreshCw, Search } from 'lucide-react'
import { formatBs, formatUsd, formatUsdt } from '@/lib/format'

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
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

      await loadGuests()
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

      return channel
    }

    const channelPromise = init()

    return () => {
      mounted = false
      channelPromise.then((channel) => {
        if (channel) supabase.removeChannel(channel)
      })
    }
  }, [loadGuests, router])

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
        })
        loadGuests()
      }
    } catch (error) {
      console.error('Error adding guest:', error)
      setMessage({ type: 'error', text: 'Error al agregar el invitado.' })
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
              <span className="font-serif text-sm uppercase tracking-[0.25em] text-ink">Es padrino</span>
            </label>
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
                    <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Nombre</th>
                    <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Correo</th>
                    <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Acompañantes</th>
                    <th className={`${labelClasses} px-6 py-3 text-left font-normal`}>Estado</th>
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
                          <p className="font-serif text-base font-light text-ink">{guest.full_name}</p>
                          <p className="mt-0.5 font-serif text-xs italic text-ink-faint">{formatDate(guest.created_at)}</p>
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
                          {guest.is_godparent ? (
                            <span className="inline-block rounded-full border border-brass/40 px-3 py-1 font-serif text-[0.65rem] uppercase tracking-[0.2em] text-brass">
                              Padrino
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
      </main>
    </div>
  )
}
