'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { formatVzAmount, parseVzAmount } from '@/lib/format'
import { ColorStack } from './ui/color-stack'

interface GuestData {
  id: string
  full_name: string
  email: string
  plus_ones: number
  gift_description: string | null
  gift_type: string | null
  gift_amount_usd: number | null
  gift_amount_bs: number | null
  is_godparent: boolean
  is_attending: boolean | null
  gender: string | null
}

interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
}

type Phase = 'validating' | 'envelope' | 'video' | 'invitation'
type RsvpStatus = 'idle' | 'saving'

const WEDDING_DATE = new Date('2026-09-12T13:15:00').getTime()

const CEREMONY = {
  venue: 'Capilla del Colegio Mater Salvatoris',
  address: 'Avenida 3C con Calle 70 · Sector Bellas Artes',
  time: '1:15 PM',
  mapsUrl: 'https://maps.app.goo.gl/iVya4hWfs5VzqQD48',
}

const WEDDING_LABEL = 'Sábado, 12 de septiembre de 2026'
const RSVP_DEADLINE = '24 de agosto de 2026'
const RSVP_DEADLINE_DATE = new Date('2026-08-24T23:59:59').getTime()

const MOBILE_PAYMENT = {
  bank: 'Plaza',
  phone: '0412-1688466',
  id: 'V-29.543.140',
  holder: 'Javier Díaz',
}

const BINANCE = {
  id: '394162718',
  user: 'javierd79',
  email: 'javierdiazt406@icloud.com',
}

const SECRET_MESSAGE =
  'Shh… un secreto así no se cuenta antes del gran día. Tu presencia ya es el mejor regalo.'

const AGENDA = [
  { time: '1:15 PM', label: 'Entrada' },
  { time: '2:00 PM', label: 'Ceremonia' },
  { time: '4:00 PM', label: 'Brindis' },
]

const SECTION_META = [
  { id: 'welcome', label: 'Bienvenida' },
  { id: 'greeting', label: 'Saludo' },
  { id: 'countdown', label: 'Fecha' },
  { id: 'ceremony', label: 'Ceremonia' },
  { id: 'schedule', label: 'Agenda' },
  { id: 'details', label: 'Detalles' },
  { id: 'story', label: 'Nuestra historia' },
  { id: 'rsvp', label: 'Asistencia' },
  { id: 'gifts', label: 'Regalos' },
  { id: 'closing', label: 'Cierre' },
]

const COUPLE_IMAGES = [
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.01.05%20PM-yFIl4CXFF1zcYXAzVU6bmZdT6AYEtI.jpeg',
    alt: 'Maria mostrando su anillo mientras sostiene un ramo de rosas',
    title: 'El día que dijo sí',
    description:
      'Maria apenas puede ocultar la emoción al mostrar el anillo que llevará por siempre en su mano.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.16%20PM-4PJ7c0Y8I56UympLmCPigCYuJPrKSw.jpeg',
    alt: 'Retrato cercano de Javier y Maria sonriendo juntos',
    title: 'Miradas que hablan',
    description:
      'Dos sonrisas y una sola certeza: juntos, cualquier camino se vuelve ligero.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.19%20PM-YUDyt5Ux4zitm5Csn35x4p7GsP94mi.jpeg',
    alt: 'Javier y Maria compartiendo un beso junto al árbol de Navidad',
    title: 'La magia de diciembre',
    description:
      'Fue junto a las luces del árbol donde este amor encontró su noche más luminosa.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.18%20PM-xNi0qVQufN1w5sYrXcG5RC4t5Z5eYK.jpeg',
    alt: 'Javier y Maria posando juntos en casa',
    title: 'Nuestro lugar en el mundo',
    description:
      'Los momentos cotidianos en casa guardan la ternura que se repite cada día.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.18%20PM%20%281%29-p9vyEqovAWhMR9MV23l5tjEEGz1qbD.jpeg',
    alt: 'Javier y Maria sonriendo durante un momento cotidiano',
    title: 'La felicidad de lo simple',
    description:
      'Una tarde cualquiera, una risa compartida: la vida que queremos construir.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.14%20PM-tJQvdXwlD3dIzohQkCsjmmRlWpJPQo.jpeg',
    alt: 'Javier y Maria en un retrato íntimo',
    title: 'En confianza',
    description:
      'Cerca, sin prisa y sin pose: el retrato del amor que se guarda para siempre.',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.20%20PM-2Upv1xEwoYco3Sj7mp45wcXHNPclql.jpeg',
    alt: 'Javier y Maria juntos durante una noche al aire libre',
    title: 'Bajo las estrellas',
    description:
      'De la noche nació este compromiso; de su luz queremos iluminar el resto de nuestros días.',
  },
]

const PHOTO_SPANS = [
  'col-span-2 row-span-2',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-2 row-span-1',
  'col-span-2 row-span-1',
]

interface WeddingInvitationProps {
  guestId: string | null
}

const sectionTransition = { type: 'spring', bounce: 0, duration: 0.7 } as const

function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-serif text-[0.75rem] uppercase tracking-[0.32em] text-ink-faint ${className}`}>
      {children}
    </p>
  )
}

function Ornament({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="h-px w-14 bg-ink/15" />
      <span className="block h-1.5 w-1.5 rotate-45 bg-brass" />
      <span className="h-px w-14 bg-ink/15" />
    </div>
  )
}

function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="snap-section flex min-h-svh flex-col justify-center py-20">
      <motion.div
        className="flex w-full flex-col items-center text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-15% 0px -15% 0px' }}
        transition={sectionTransition}
      >
        {children}
      </motion.div>
    </section>
  )
}

function GiftPanel({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}

function GiftBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 flex items-center gap-2 font-serif text-xs uppercase tracking-[0.25em] text-ink-faint transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
    >
      <span aria-hidden="true" className="text-sm leading-none">‹</span>
      Volver
    </button>
  )
}

function GiftSaveButton({
  onSave,
  disabled,
  saving,
}: {
  onSave: () => void
  disabled: boolean
  saving: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onSave}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      className="mt-8 w-full border border-ink/30 px-8 py-3 font-serif text-sm uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-ivory disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-ink"
    >
      {saving ? 'Guardando…' : 'Guardar'}
    </motion.button>
  )
}

function GiftFeedback({ saved, error }: { saved: boolean; error: boolean }) {
  return (
    <>
      <AnimatePresence>
        {saved && (
          <motion.p
            key="gift-feedback"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
            className="mt-6 font-serif text-sm italic text-ink-soft"
          >
            Gracias por compartir tu regalo. Lo tendremos en cuenta.
          </motion.p>
        )}
      </AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 font-serif text-sm italic text-red-700/80"
        >
          No pudimos guardar tu detalle. Inténtalo de nuevo.
        </motion.p>
      )}
    </>
  )
}

export default function WeddingInvitation({ guestId }: WeddingInvitationProps) {
  const [phase, setPhase] = useState<Phase>('validating')
  const [guestData, setGuestData] = useState<GuestData | null>(null)
  const [validationError, setValidationError] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<Countdown>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })
  const [activeSection, setActiveSection] = useState('welcome')
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('idle')
  const [rsvpError, setRsvpError] = useState(false)
  const [rsvpClosed, setRsvpClosed] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)
  const [giftMode, setGiftMode] = useState<'inmediato' | 'fiesta' | null>(null)
  const [immediateGift, setImmediateGift] = useState<'pago_movil' | 'binance' | null>(null)
  const [partyGift, setPartyGift] = useState<'secreto' | 'fisico' | 'efectivo' | null>(null)
  const [giftDescription, setGiftDescription] = useState('')
  const [giftCashAmount, setGiftCashAmount] = useState('')
  const [giftBsAmount, setGiftBsAmount] = useState('')
  const [giftUsdtAmount, setGiftUsdtAmount] = useState('')
  const [giftStatus, setGiftStatus] = useState<RsvpStatus>('idle')
  const [giftSaved, setGiftSaved] = useState(false)
  const [giftError, setGiftError] = useState(false)
  const closePhotoRef = useRef<HTMLButtonElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!guestData) return
    setGiftDescription(guestData.gift_description ?? '')
    setGiftCashAmount(guestData.gift_amount_usd != null ? formatVzAmount(String(guestData.gift_amount_usd)) : '')
    setGiftBsAmount(guestData.gift_amount_bs != null ? formatVzAmount(String(guestData.gift_amount_bs)) : '')
    if (guestData.gift_type === 'fisico' || guestData.gift_type === 'efectivo') {
      setGiftMode('fiesta')
      setPartyGift(guestData.gift_type)
    } else if (guestData.gift_type === 'pago_movil' || guestData.gift_type === 'binance') {
      setGiftMode('inmediato')
      setImmediateGift(guestData.gift_type)
      setGiftUsdtAmount(guestData.gift_amount_usd != null ? formatVzAmount(String(guestData.gift_amount_usd)) : '')
    }
  }, [guestData])

  useEffect(() => {
    if (selectedPhoto === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPhoto(null)
    }
    window.addEventListener('keydown', onKey)
    closePhotoRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedPhoto])

  const boyPalette = [
    "#7D563E", // Lila
    "#101E32",
    "#222222", // Azul claro
    "#1E4332", // Verde salvia
    "#656565", // Gris
  ]

  const girlPalette = [
    "#C8A2C8", // Lila
    "#7CB9E8", // Azul claro
    "#8FBC8F", // Verde salvia
    "#FF91A4", // Rosa
    "#F4D03F", // Amarillo
  ]

  // Calculate countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const distance = WEDDING_DATE - now
      setRsvpClosed(now >= RSVP_DEADLINE_DATE)

      if (distance > 0) {
        setCountdown({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        })
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  // Validate guest with Supabase
  const validateGuest = async (): Promise<boolean> => {
    if (!guestId) {
      setValidationError(true)
      return false
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single()

      if (error || !data) {
        setValidationError(true)
        return false
      }

      setGuestData(data as GuestData)
      return true
    } catch (err) {
      console.error('[v0] Error validating guest:', err)
      setValidationError(true)
      return false
    }
  }

  // Preload and cache the video and letter image during the loading screen
  const preloadAssets = async () => {
    const img = new Image()
    img.src = '/letter.png'

    try {
      setLoadProgress(0)
      const res = await fetch('/letter.mp4')

      if (!res.ok || !res.body) {
        throw new Error('Video preload failed')
      }

      const total = Number(res.headers.get('content-length')) || 0
      const reader = res.body.getReader()
      const chunks: BlobPart[] = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value as BlobPart)
          received += value.length
          if (total > 0) {
            setLoadProgress(Math.min(100, Math.round((received / total) * 100)))
          }
        }
      }

      const blob = new Blob(chunks, { type: 'video/mp4' })
      setVideoUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error('[v0] Error preloading video:', err)
      setVideoUrl(null)
    } finally {
      setLoadProgress(100)
    }
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const isValid = await validateGuest()
      if (cancelled || !isValid) return

      await preloadAssets()
      if (!cancelled) setPhase('envelope')
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  // Clean up the cached video blob when leaving the page
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  // Track the active full-screen section for the indicator.
  useEffect(() => {
    if (phase !== 'invitation' || !scrollRef.current) return

    const root = scrollRef.current
    const sections = root.querySelectorAll<HTMLElement>('.snap-section')
    const observer = new IntersectionObserver(
      (entries) => {
        let mostVisible: { id: string; ratio: number } | null = null
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (!mostVisible || entry.intersectionRatio > mostVisible.ratio) {
            mostVisible = { id: entry.target.id, ratio: entry.intersectionRatio }
          }
        }
        if (mostVisible) setActiveSection(mostVisible.id)
      },
      { root, threshold: [0.1, 0.3, 0.5, 0.7, 0.9] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [phase])

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleEnvelopeClick = () => {
    setPhase('video')
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play()
      }
    }, 100)
  }

  const handleVideoEnded = () => {
    setPhase('invitation')
  }

  const handleRSVP = async (attending: boolean) => {
    if (!guestData || guestData.is_attending === attending || rsvpClosed) return

    setRsvpStatus('saving')
    setRsvpError(false)

    try {
      const supabase = createClient()
      await supabase.from('guests').update({ is_attending: attending }).eq('id', guestData.id)

      setGuestData({ ...guestData, is_attending: attending })
    } catch (err) {
      console.error('[v0] Error updating RSVP:', err)
      setRsvpError(true)
    } finally {
      setRsvpStatus('idle')
    }
  }

  const handleSaveGift = async () => {
    if (!guestData || giftStatus === 'saving') return

    setGiftStatus('saving')
    setGiftError(false)
    setGiftSaved(false)

    const payload: Partial<GuestData> = {}
    if (giftMode === 'inmediato' && immediateGift === 'pago_movil') {
      const amount = parseVzAmount(giftBsAmount)
      payload.gift_type = amount > 0 ? 'pago_movil' : null
      payload.gift_amount_bs = amount > 0 ? amount : null
      payload.gift_amount_usd = null
      payload.gift_description = null
    } else if (giftMode === 'inmediato' && immediateGift === 'binance') {
      const amount = parseVzAmount(giftUsdtAmount)
      payload.gift_type = amount > 0 ? 'binance' : null
      payload.gift_amount_usd = amount > 0 ? amount : null
      payload.gift_amount_bs = null
      payload.gift_description = null
    } else if (partyGift === 'fisico') {
      const description = giftDescription.trim()
      payload.gift_type = description ? 'fisico' : null
      payload.gift_description = description || null
      payload.gift_amount_usd = null
      payload.gift_amount_bs = null
    } else if (partyGift === 'efectivo') {
      const amount = parseVzAmount(giftCashAmount)
      payload.gift_type = amount > 0 ? 'efectivo' : null
      payload.gift_amount_usd = amount > 0 ? amount : null
      payload.gift_amount_bs = null
      payload.gift_description = null
    } else {
      setGiftStatus('idle')
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('guests')
        .update(payload)
        .eq('id', guestData.id)

      if (error) {
        console.error('[v0] Error saving gift:', error)
        setGiftError(true)
      } else {
        setGiftSaved(true)
        setGuestData({ ...guestData, ...payload })
      }
    } catch (err) {
      console.error('[v0] Error saving gift:', err)
      setGiftError(true)
    } finally {
      setGiftStatus('idle')
    }
  }

  // Validating Phase
  if (phase === 'validating') {
    if (validationError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ivory p-6">
          <div className="w-full max-w-md">
            <div className="mb-12 text-center">
              <div className="mx-auto mb-8 h-12 w-1 bg-ink/15"></div>
              <h1 className="mb-6 font-serif text-4xl font-light tracking-tight text-ink">
                Acceso denegado
              </h1>
              <Ornament className="mx-auto mb-8" />
            </div>

            <div className="space-y-8 text-center">
              <p className="font-serif text-base font-light leading-relaxed text-ink-soft">
                Lo sentimos, esta invitación requiere un enlace de acceso válido. Revisa tu correo
                para asegurarte de tener el enlace correcto.
              </p>

              <div className="border-t border-ink/10 pt-8">
                <p className="mb-4 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
                  ¿Necesitas ayuda?
                </p>
                <p className="font-serif text-sm font-light text-ink-soft">
                  Contacta directamente con la pareja para recibir asistencia.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ivory p-6">
        <div className="max-w-md text-center">
          <div className="mb-16 text-ink">
            <div className="mb-8 flex justify-center">
              <div className="relative h-12 w-12">
                <svg className="h-full w-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.15"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="141 141"
                    strokeDashoffset="0"
                    style={{ animation: 'spin 3s linear infinite' }}
                  />
                  <path d="M50 30 L65 45 L50 60 L35 45 Z" fill="currentColor" opacity="0.4" />
                </svg>
              </div>
            </div>

            <div className="mx-auto mb-12 h-12 w-px bg-ink/15"></div>
          </div>

          <Eyebrow className="mb-2">Un momento</Eyebrow>
          <p className="mt-3 font-serif text-xl font-light text-ink">Preparando tu invitación</p>

          <div className="mt-10">
            <div className="mx-auto h-px w-56 overflow-hidden bg-ink/10">
              <div
                className="h-full bg-ink/40 transition-all duration-200"
                style={{ width: `${loadProgress}%` }}
              ></div>
            </div>
            <p className="mt-4 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
              {loadProgress}%
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Envelope Phase
  if (phase === 'envelope' && guestData) {
    return (
      <motion.div
        className="flex h-dvh items-center justify-center overflow-hidden bg-black p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          role="button"
          tabIndex={0}
          aria-label="Abrir la invitación"
          className="relative h-full w-full cursor-pointer"
          onClick={handleEnvelopeClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleEnvelopeClick()
            }
          }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-2xl" style={{ backgroundColor: 'rgb(26, 16, 8)' }}>
            <img
              src="/letter.png"
              alt="Sobre de la invitación"
              draggable={false}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-30"></div>

            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{
                background: 'radial-gradient(rgba(0, 0, 0, 0.35) 0%, transparent 70%)',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-cormorant), Georgia, serif',
                  fontSize: '0.85rem',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: '#ffffff',
                  textShadow: '0 1px 10px rgba(0,0,0,0.6), 0 0 3px rgba(0,0,0,0.4)',
                  userSelect: 'none',
                  margin: 0,
                  paddingBottom: '20%',
                }}
              >
                Presiona para abrir
              </p>
              <div
                style={{
                  width: '28px',
                  height: '1px',
                  background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)',
                }}
              ></div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // Video Phase - Fullscreen
  if (phase === 'video' && guestData) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <video
          ref={videoRef}
          onEnded={handleVideoEnded}
          autoPlay
          playsInline
          muted
          poster="/letter.png"
          className="h-full w-full object-cover"
          src={videoUrl ?? '/letter.mp4'}
        ></video>

        <button
          type="button"
          onClick={handleVideoEnded}
          className="absolute bottom-6 right-6 rounded-full border border-white/25 bg-white/10 px-6 py-2.5 font-serif text-xs uppercase tracking-[0.25em] text-white/80 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Omitir
        </button>
      </motion.div>
    )
  }

  // Invitation Phase
  if (phase === 'invitation' && guestData) {
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          className="invitation-shell min-h-screen overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <nav className="section-indicator" aria-label="Secciones de la invitación">
            <span className="section-indicator-line" aria-hidden="true" />
            {SECTION_META.map((section, index) => {
              const active = activeSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-label={`Ir a ${section.label}`}
                  aria-current={active ? 'true' : undefined}
                  className={`section-dot ${active ? 'is-active' : ''}`}
                  onClick={() => scrollToSection(section.id)}
                >
                  <motion.span
                    className="section-dot-core"
                    animate={{
                      scale: active ? 1.6 : 1,
                      backgroundColor: active ? '#a98f55' : 'rgba(0,0,0,0)',
                    }}
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.45 }}
                  />
                  <span className="section-dot-label">
                    {String(index + 1).padStart(2, '0')} {section.label}
                  </span>
                </button>
              )
            })}
          </nav>

          <div ref={scrollRef} className="invitation-scroll snap-y snap-mandatory">
            <div className="mx-auto w-full max-w-4xl px-6">
              {/* Header - Names */}
              <Section id="welcome">
                <Eyebrow className="mb-6">Matrimonio Eclesiástico</Eyebrow>
                <h1 className="font-serif text-[clamp(2.6rem,7.5vw,4.75rem)] font-light leading-none tracking-[-0.02em] text-ink">
                  Javier Andrés
                </h1>
                <span className="my-4 font-serif text-[clamp(2rem,6vw,3.25rem)] font-light italic leading-none text-brass">
                  &amp;
                </span>
                <h2 className="font-serif text-[clamp(2.6rem,7.5vw,4.75rem)] font-light leading-none tracking-[-0.02em] text-ink">
                  Maria Zolis
                </h2>
                <Ornament className="mt-10" />
                <p className="mt-6 font-serif text-base italic tracking-wide text-ink-soft">
                  Juntos hasta el Cielo
                </p>

                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-ink-faint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                >
                  <span className="font-serif text-[0.6rem] uppercase tracking-[0.32em]">
                    Desliza hacia abajo
                  </span>
                  <motion.svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={{ y: [0, 6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </motion.svg>
                </motion.div>
              </Section>

              {/* Personalized Greeting */}
              <Section id="greeting">
                <Eyebrow className="mb-8">Una invitación para ti</Eyebrow>
                <h2 className="font-serif text-2xl font-light text-ink md:text-3xl">
                  {guestData.gender === 'female'
                    ? 'Querida'
                    : guestData.gender === 'male'
                      ? 'Querido'
                      : 'Querido/a'}
                </h2>
                <span className="font-serif text-2xl text-ink md:text-3xl font-medium">{guestData.full_name}</span>
                <p className="mt-6 max-w-md font-serif text-lg font-light leading-relaxed text-ink-soft">
                  Es un honor para nosotros que formes parte de un día tan especial. Queremos
                  compartir contigo la alegría de unir nuestras vidas para siempre.
                </p>
              </Section>

              {/* Countdown */}
              <Section id="countdown">
                <Eyebrow className="mb-10">Cuenta regresiva</Eyebrow>
                <div className="grid grid-cols-4 gap-4 md:gap-8">
                  {[
                    { value: countdown.days, label: 'Días' },
                    { value: countdown.hours, label: 'Horas' },
                    { value: countdown.minutes, label: 'Min' },
                    { value: countdown.seconds, label: 'Seg' },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col items-center">
                      <span className="font-serif text-4xl font-light tabular-nums text-ink md:text-6xl">
                        {String(item.value).padStart(2, '0')}
                      </span>
                      <span className="mt-3 font-serif text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
                <Ornament className="mt-12" />
                <p className="mt-6 font-serif text-lg font-light text-ink-soft">{WEDDING_LABEL}</p>
              </Section>

              {/* Ceremony */}
              <Section id="ceremony">
                <Eyebrow className="mb-12">La ceremonia</Eyebrow>
                <div className="flex w-full max-w-md flex-col items-center gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
                      Hora
                    </span>
                    <span className="font-serif text-3xl font-light tabular-nums text-ink">
                      {CEREMONY.time}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
                      Lugar
                    </span>
                    <span className="font-serif text-2xl font-light text-ink">{CEREMONY.venue}</span>
                    <span className="mt-1 font-serif text-sm font-light leading-relaxed text-ink-soft">
                      {CEREMONY.address}
                    </span>
                  </div>
                  <a
                    href={CEREMONY.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 border border-ink/30 px-8 py-3 font-serif text-sm uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-ivory focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    Cómo llegar
                  </a>
                </div>
              </Section>

              {/* Agenda */}
              <Section id="schedule">
                <Eyebrow className="mb-12">Agenda del día</Eyebrow>
                <div className="w-full max-w-md">
                  {AGENDA.map((item, idx) => (
                    <div
                      key={item.label}
                      className={`flex items-baseline justify-between gap-6 py-5 ${idx < AGENDA.length - 1 ? 'border-b border-ink/10' : ''
                        }`}
                    >
                      <span className="font-serif text-lg font-light text-ink">{item.label}</span>
                      <span className="font-serif text-sm tabular-nums tracking-wide text-ink-soft">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Details */}
              <Section id="details">
                <Eyebrow className="mb-12">Detalles</Eyebrow>
                <div className="flex w-full max-w-md flex-col items-center gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
                      Código de vestimenta
                    </span>
                    <span className="font-serif text-2xl font-light text-ink">Semiformal/Formal</span>
                    <span className="my-1 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
                      Paletas de colores
                    </span>
                    <div className="flex gap-4 flex-col sm:flex-row my-1">
                      <div>
                        <span className="font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">Damas</span>
                        <ColorStack colors={girlPalette} overlap={18} />
                      </div>
                      <div>
                        <span className="font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">Caballeros</span>
                        <ColorStack colors={boyPalette} overlap={18} />
                      </div>
                    </div>
                    <p className="mt-2 max-w-xs font-serif text-sm font-light italic leading-relaxed text-ink-soft">
                      Elegante, cómodo y fresco.
                    </p>
                  </div>

                  <Ornament />

                  <div className="flex flex-col items-center gap-5">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
                        Acompañantes
                      </span>
                      <span className="font-serif text-xl font-light text-ink">
                        {guestData.plus_ones}
                      </span>
                    </div>
                    {guestData.is_godparent && (
                      <p className="font-serif text-base font-light italic text-brass">
                        {guestData.gender === 'female' ? 'Madrina de la boda' : 'Padrino de la boda'}
                      </p>
                    )}
                  </div>
                </div>
              </Section>

              {/* Nuestra historia */}
              <Section id="story">
                <div className="mb-10 flex flex-col items-center text-center">
                  <Eyebrow className="mb-5">Nuestra historia</Eyebrow>
                  <h2 className="font-serif text-3xl font-light tracking-[-0.01em] text-ink md:text-4xl">
                    Los momentos que nos trajeron aquí
                  </h2>
                  <p className="mt-4 max-w-md font-serif text-base font-light leading-relaxed text-ink-soft">
                    Unos recuerdos del hermoso camino que queremos compartir contigo.
                  </p>
                </div>

                <div
                  className="relative grid h-[clamp(20rem,48svh,28rem)] w-full max-w-3xl grid-cols-4 grid-rows-[1fr_1fr_0.8fr] gap-2 md:gap-3"
                  role="list"
                  aria-label="Fotos de Javier y Maria"
                >
                  {COUPLE_IMAGES.map((image, index) => (
                    <figure
                      key={image.src}
                      className={`${PHOTO_SPANS[index]} min-h-0 overflow-hidden rounded-2xl bg-ivory-deep ${selectedPhoto !== null ? 'pointer-events-none' : ''
                        }`}
                      role="listitem"
                    >
                      <motion.button
                        type="button"
                        onClick={() => setSelectedPhoto(index)}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                        animate={
                          selectedPhoto === index
                            ? { opacity: 0, scale: 1 }
                            : selectedPhoto !== null
                              ? { opacity: 0.35, scale: 0.94 }
                              : { opacity: 1, scale: 1 }
                        }
                        className="group block h-full w-full"
                        aria-label={`Ampliar fotografía: ${image.title}`}
                        aria-pressed={selectedPhoto === index}
                      >
                        <motion.img
                          src={image.src}
                          alt={image.alt}
                          loading="lazy"
                          layoutId={`story-photo-${index}`}
                          transition={{ type: 'spring', bounce: 0, duration: 0.55 }}
                          className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                      </motion.button>
                    </figure>
                  ))}

                  <AnimatePresence initial={false}>
                    {selectedPhoto !== null && (
                      <motion.div
                        key="story-detail"
                        className="absolute inset-0 z-20 overflow-hidden rounded-2xl bg-ivory"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Fotografía: ${COUPLE_IMAGES[selectedPhoto].title}`}
                      >
                        <AnimatePresence initial={false} mode="popLayout">
                          <motion.div
                            key={selectedPhoto}
                            layoutId={`story-photo-${selectedPhoto}`}
                            transition={{ type: 'spring', bounce: 0, duration: 0.55 }}
                            exit={{ opacity: 0, transition: { duration: 0.15 } }}
                            onClick={() => setSelectedPhoto(null)}
                            style={{ backgroundImage: `url(${COUPLE_IMAGES[selectedPhoto].src})` }}
                            className="absolute inset-0 cursor-zoom-out bg-cover bg-center"
                          />
                        </AnimatePresence>

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/60 via-ink/10 to-transparent md:bg-linear-to-r md:from-transparent md:via-transparent md:to-ink/50"
                        />

                        <motion.button
                          ref={closePhotoRef}
                          type="button"
                          onClick={() => setSelectedPhoto(null)}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', bounce: 0, duration: 0.4, delay: 0.25 }}
                          className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/80 text-ink backdrop-blur-md transition-colors hover:bg-ivory focus-visible:outlin focus-visible:outline-offset-2 focus-visible:outline-brass"
                          aria-label="Cerrar fotografía"
                        >
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path
                              d="M1 1l12 12M13 1L1 13"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </motion.button>

                        <motion.div
                          initial={{ opacity: 0, y: 28 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 28 }}
                          transition={{ type: 'spring', bounce: 0, duration: 0.5, delay: 0.15 }}
                          className="absolute inset-x-0 bottom-0 z-10 border-t border-ivory/20 bg-ivory/80 px-6 pb-5 pt-5 text-left backdrop-blur-md md:inset-x-auto md:inset-y-0 md:right-0 md:w-72 md:flex md:flex-col md:justify-center md:border-l md:border-t-0 md:px-7"
                        >
                          <Eyebrow>Fotografía {String(selectedPhoto + 1).padStart(2, '0')}</Eyebrow>
                          <h3 className="mt-2 font-serif text-2xl font-light leading-snug text-ink">
                            {COUPLE_IMAGES[selectedPhoto].title}
                          </h3>
                          <div aria-hidden="true" className="mt-4 flex items-center gap-3">
                            <span className="h-px w-12 bg-ink/15" />
                            <span className="block h-1.5 w-1.5 rotate-45 bg-brass" />
                          </div>
                          <p className="mt-4 font-serif text-sm font-light italic leading-relaxed text-ink-soft">
                            {COUPLE_IMAGES[selectedPhoto].description}
                          </p>

                          <div className="mt-6 flex gap-2 md:mt-8">
                            {COUPLE_IMAGES.map((thumb, thumbIndex) => (
                              <button
                                key={thumb.src}
                                type="button"
                                onClick={() => setSelectedPhoto(thumbIndex)}
                                aria-label={`Ver fotografía: ${thumb.title}`}
                                aria-current={thumbIndex === selectedPhoto}
                                className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-brass"
                              >
                                <img
                                  src={thumb.src}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                                {thumbIndex === selectedPhoto && (
                                  <motion.span
                                    layoutId="story-thumb-active"
                                    transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
                                    className="absolute inset-0 rounded-lg ring-2 ring-brass"
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Section>

              {/* RSVP */}
              <Section id="rsvp">
                <Eyebrow className="mb-8">RSVP</Eyebrow>
                <h2 className="font-serif text-2xl font-light text-ink">¿Nos acompañas?</h2>
                <p className="mt-3 font-serif text-sm font-light text-ink-soft">
                  {rsvpClosed
                    ? `El plazo para confirmar tu asistencia finalizó el ${RSVP_DEADLINE}.`
                    : `Por favor confirma tu asistencia antes del ${RSVP_DEADLINE}`}
                </p>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <motion.button
                    type="button"
                    onClick={() => handleRSVP(true)}
                    disabled={rsvpStatus === 'saving' || rsvpClosed}
                    whileTap={rsvpStatus === 'saving' || rsvpClosed ? undefined : { scale: 0.97 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                    className={`border px-10 py-3.5 font-serif text-sm uppercase tracking-[0.25em] transition-colors disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-ink/40 disabled:hover:bg-transparent disabled:hover:text-ink ${guestData.is_attending === true
                        ? 'border-ink bg-ink text-ivory'
                        : 'border-ink/40 text-ink hover:bg-ink hover:text-ivory'
                      } ${rsvpStatus === 'saving' ? 'cursor-wait opacity-60' : ''}`}
                  >
                    Sí, asistiré
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => handleRSVP(false)}
                    disabled={rsvpStatus === 'saving' || rsvpClosed}
                    whileTap={rsvpStatus === 'saving' || rsvpClosed ? undefined : { scale: 0.97 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                    className={`border px-10 py-3.5 font-serif text-sm uppercase tracking-[0.25em] transition-colors disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-ink/20 disabled:hover:text-ink-soft ${guestData.is_attending === false
                        ? 'border-ink bg-ink text-ivory'
                        : 'border-ink/20 text-ink-soft hover:border-ink/50 hover:text-ink'
                      } ${rsvpStatus === 'saving' ? 'cursor-wait opacity-60' : ''}`}
                  >
                    No podré asistir
                  </motion.button>
                </div>

                <AnimatePresence>
                  {guestData.is_attending !== null && (
                    <motion.div
                      key="rsvp-feedback"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                      className="mt-10 flex flex-col items-center gap-2"
                    >
                      <Ornament />
                      <p className="mt-4 font-serif text-lg font-light text-ink">
                        {guestData.is_attending
                          ? '¡Gracias! Te esperamos el 12 de septiembre.'
                          : 'Gracias por avisarnos. Te extrañaremos.'}
                      </p>
                      <p className="font-serif text-xs italic text-ink-faint">
                        ¿Cambiaste de opinión? Puedes actualizar tu respuesta.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {rsvpError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8 font-serif text-sm italic text-red-700/80"
                  >
                    No pudimos guardar tu respuesta. Inténtalo de nuevo.
                  </motion.p>
                )}
              </Section>

              {/* Regalos */}
              <Section id="gifts">
                <Eyebrow className="mb-8">Regalos</Eyebrow>
                <h2 className="font-serif text-2xl font-light text-ink">El mejor regalo es tu presencia</h2>
                <p className="mt-3 max-w-sm font-serif text-sm font-light italic leading-relaxed text-ink-soft">
                  Aunque si deseas compartir un detalle con nosotros, elige cómo prefieres hacerlo.
                </p>

                <div className="mt-10 w-full max-w-md text-left">
                  <AnimatePresence mode="wait">
                    {giftMode === null ? (
                      <GiftPanel key="gift-menu">
                        <div className="flex flex-col gap-4">
                          <motion.button
                            type="button"
                            onClick={() => {
                              setImmediateGift(null)
                              setGiftMode('inmediato')
                            }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                            className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-ivory-deep/60 px-6 py-5 text-left transition-colors hover:border-brass/60 hover:bg-ivory-deep"
                          >
                            <span>
                              <span className="block font-serif text-base font-light uppercase tracking-[0.15em] text-ink">
                                Regalo inmediato
                              </span>
                              <span className="mt-1 block font-serif text-xs italic text-ink-soft">
                                Sin esperar al gran día.
                              </span>
                            </span>
                            <span
                              aria-hidden="true"
                              className="block h-1.5 w-1.5 shrink-0 rotate-45 bg-brass transition-transform duration-300 group-hover:scale-125"
                            />
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => {
                              setPartyGift(null)
                              setGiftMode('fiesta')
                            }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                            className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-ivory-deep/60 px-6 py-5 text-left transition-colors hover:border-brass/60 hover:bg-ivory-deep"
                          >
                            <span>
                              <span className="block font-serif text-base font-light uppercase tracking-[0.15em] text-ink">
                                Regalo en fiesta
                              </span>
                              <span className="mt-1 block font-serif text-xs italic text-ink-soft">
                                El día de la celebración.
                              </span>
                            </span>
                            <span
                              aria-hidden="true"
                              className="block h-1.5 w-1.5 shrink-0 rotate-45 bg-brass transition-transform duration-300 group-hover:scale-125"
                            />
                          </motion.button>
                        </div>
                      </GiftPanel>
                    ) : giftMode === 'inmediato' && immediateGift === null ? (
                      <GiftPanel key="gift-immediate-menu">
                        <GiftBack onClick={() => setGiftMode(null)} />
                        <div className="flex flex-col gap-4">
                          <motion.button
                            type="button"
                            onClick={() => setImmediateGift('pago_movil')}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                            className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-ivory-deep/60 px-6 py-5 text-left transition-colors hover:border-brass/60 hover:bg-ivory-deep"
                          >
                            <span>
                              <span className="block font-serif text-base font-light uppercase tracking-[0.15em] text-ink">
                                Pago Móvil
                              </span>
                              <span className="mt-1 block font-serif text-xs italic text-ink-soft">
                                En bolívares, desde Venezuela.
                              </span>
                            </span>
                            <span
                              aria-hidden="true"
                              className="block h-1.5 w-1.5 shrink-0 rotate-45 bg-brass transition-transform duration-300 group-hover:scale-125"
                            />
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => setImmediateGift('binance')}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                            className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-ivory-deep/60 px-6 py-5 text-left transition-colors hover:border-brass/60 hover:bg-ivory-deep"
                          >
                            <span>
                              <span className="block font-serif text-base font-light uppercase tracking-[0.15em] text-ink">
                                Binance
                              </span>
                              <span className="mt-1 block font-serif text-xs italic text-ink-soft">
                                En USDT, desde cualquier país.
                              </span>
                            </span>
                            <span
                              aria-hidden="true"
                              className="block h-1.5 w-1.5 shrink-0 rotate-45 bg-brass transition-transform duration-300 group-hover:scale-125"
                            />
                          </motion.button>
                        </div>
                      </GiftPanel>
                    ) : giftMode === 'inmediato' && immediateGift === 'pago_movil' ? (
                      <GiftPanel key="gift-pago-movil">
                        <GiftBack onClick={() => setImmediateGift(null)} />
                        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-ivory-deep/60">
                          {(
                            [
                              ['Banco', MOBILE_PAYMENT.bank],
                              ['Teléfono', MOBILE_PAYMENT.phone],
                              ['Cédula', MOBILE_PAYMENT.id],
                              ['Titular', MOBILE_PAYMENT.holder],
                            ] as const
                          ).map(([label, value], idx) => (
                            <div
                              key={label}
                              className={`flex items-baseline justify-between gap-4 px-6 py-3.5 ${idx < 3 ? 'border-b border-ink/10' : ''
                                }`}
                            >
                              <span className="font-serif text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">
                                {label}
                              </span>
                              <span className="font-serif text-base font-light text-ink">{value}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-6 font-serif text-xs italic text-ink-soft">
                          Pago Móvil en bolívares. Menciona tu nombre al realizar el pago.
                        </p>
                        <label className="mt-4 block">
                          <span className="font-serif text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">
                            Monto en Bs.
                          </span>
                          <span className="mt-2 flex items-baseline gap-2 border-b border-ink/20 pb-2 focus-within:border-brass">
                            <span className="font-serif text-2xl font-light text-ink">Bs.</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={giftBsAmount}
                              onChange={(e) => {
                                setGiftBsAmount(formatVzAmount(e.target.value))
                                setGiftSaved(false)
                              }}
                              placeholder="0,00"
                              className="w-full bg-transparent font-serif text-2xl font-light text-ink placeholder:text-ink/25 focus:outline-none"
                            />
                          </span>
                        </label>
                        <GiftSaveButton
                          onSave={handleSaveGift}
                          disabled={giftStatus === 'saving' || giftBsAmount.trim() === ''}
                          saving={giftStatus === 'saving'}
                        />
                        <GiftFeedback saved={giftSaved} error={giftError} />
                      </GiftPanel>
                    ) : giftMode === 'inmediato' ? (
                      <GiftPanel key="gift-binance">
                        <GiftBack onClick={() => setImmediateGift(null)} />
                        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-ivory-deep/60">
                          {(
                            [
                              ['ID', BINANCE.id],
                              ['Usuario', BINANCE.user],
                              ['Correo', BINANCE.email],
                            ] as const
                          ).map(([label, value], idx) => (
                            <div
                              key={label}
                              className={`flex items-baseline justify-between gap-4 px-6 py-3.5 ${idx < 2 ? 'border-b border-ink/10' : ''
                                }`}
                            >
                              <span className="font-serif text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">
                                {label}
                              </span>
                              <span className="font-serif text-base font-light text-ink">{value}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-6 font-serif text-xs italic text-ink-soft">
                          Binance en USDT. Menciona tu nombre al realizar el envío.
                        </p>
                        <label className="mt-4 block">
                          <span className="font-serif text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">
                            Monto en USDT
                          </span>
                          <span className="mt-2 flex items-baseline gap-2 border-b border-ink/20 pb-2 focus-within:border-brass">
                            <span className="font-serif text-2xl font-light text-ink">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={giftUsdtAmount}
                              onChange={(e) => {
                                setGiftUsdtAmount(formatVzAmount(e.target.value))
                                setGiftSaved(false)
                              }}
                              placeholder="0,00"
                              className="w-full bg-transparent font-serif text-2xl font-light text-ink placeholder:text-ink/25 focus:outline-none"
                            />
                          </span>
                        </label>
                        <GiftSaveButton
                          onSave={handleSaveGift}
                          disabled={giftStatus === 'saving' || giftUsdtAmount.trim() === ''}
                          saving={giftStatus === 'saving'}
                        />
                        <GiftFeedback saved={giftSaved} error={giftError} />
                      </GiftPanel>
                    ) : partyGift === null ? (
                      <GiftPanel key="gift-fiesta-menu">
                        <GiftBack onClick={() => setGiftMode(null)} />
                        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-ivory-deep/60">
                          {(
                            [
                              ['secreto', 'Secreto', 'Una sorpresa que se guarda para el gran día'],
                              ['fisico', 'Regalo físico', 'Cuéntanos qué piensas regalar'],
                              ['efectivo', 'Efectivo', 'Un aporte en dólares'],
                            ] as const
                          ).map(([id, label, hint], idx) => (
                            <motion.button
                              key={id}
                              type="button"
                              onClick={() => setPartyGift(id)}
                              whileTap={{ scale: 0.98 }}
                              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                              className={`group flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-ivory-deep ${idx < 2 ? 'border-b border-ink/10' : ''
                                }`}
                            >
                              <span>
                                <span className="block font-serif text-base font-light text-ink">
                                  {label}
                                </span>
                                <span className="mt-0.5 block font-serif text-xs italic text-ink-soft">
                                  {hint}
                                </span>
                              </span>
                              <span
                                aria-hidden="true"
                                className="block h-1.5 w-1.5 shrink-0 rotate-45 bg-brass transition-transform duration-300 group-hover:scale-125"
                              />
                            </motion.button>
                          ))}
                        </div>
                      </GiftPanel>
                    ) : partyGift === 'secreto' ? (
                      <GiftPanel key="gift-secreto">
                        <GiftBack onClick={() => setPartyGift(null)} />
                        <div className="rounded-2xl border border-ink/10 bg-ivory-deep/60 px-6 py-10 text-center">
                          <span aria-hidden="true" className="mx-auto block h-1.5 w-1.5 rotate-45 bg-brass" />
                          <p className="mt-5 font-serif text-base font-light italic leading-relaxed text-ink-soft">
                            {SECRET_MESSAGE}
                          </p>
                        </div>
                      </GiftPanel>
                    ) : partyGift === 'fisico' ? (
                      <GiftPanel key="gift-fisico">
                        <GiftBack onClick={() => setPartyGift(null)} />
                        <label className="block">
                          <span className="font-serif text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">
                            Describe tu regalo
                          </span>
                          <textarea
                            value={giftDescription}
                            onChange={(e) => {
                              setGiftDescription(e.target.value)
                              setGiftSaved(false)
                            }}
                            rows={3}
                            placeholder="Un detalle para los novios…"
                            className="mt-2 w-full resize-none border-b border-ink/20 bg-transparent pb-2 font-serif text-lg font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none"
                          />
                        </label>
                        <GiftSaveButton
                          onSave={handleSaveGift}
                          disabled={giftStatus === 'saving' || giftDescription.trim() === ''}
                          saving={giftStatus === 'saving'}
                        />
                        <GiftFeedback saved={giftSaved} error={giftError} />
                      </GiftPanel>
                    ) : (
                      <GiftPanel key="gift-efectivo">
                        <GiftBack onClick={() => setPartyGift(null)} />
                        <label className="block">
                          <span className="font-serif text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint">
                            Monto en dólares
                          </span>
                          <span className="mt-2 flex items-baseline gap-2 border-b border-ink/20 pb-2 focus-within:border-brass">
                            <span className="font-serif text-2xl font-light text-ink">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={giftCashAmount}
                              onChange={(e) => {
                                setGiftCashAmount(formatVzAmount(e.target.value))
                                setGiftSaved(false)
                              }}
                              placeholder="0,00"
                              className="w-full bg-transparent font-serif text-2xl font-light text-ink placeholder:text-ink/25 focus:outline-none"
                            />
                          </span>
                        </label>
                        <GiftSaveButton
                          onSave={handleSaveGift}
                          disabled={giftStatus === 'saving' || giftCashAmount.trim() === ''}
                          saving={giftStatus === 'saving'}
                        />
                        <GiftFeedback saved={giftSaved} error={giftError} />
                      </GiftPanel>
                    )}
                  </AnimatePresence>
                </div>
              </Section>

              {/* Closing */}
              <Section id="closing">
                <Ornament className="mb-8" />
                <p className="max-w-md font-serif text-xl font-light italic leading-relaxed text-ink-soft">
                  «Que la alegría de este día sea el comienzo de muchos más juntos»
                </p>
                <p className="mt-10 font-serif text-sm uppercase tracking-[0.3em] text-ink-faint">
                  Con amor,
                </p>
                <p className="mt-3 font-serif text-3xl font-light text-ink">Javier &amp; Maria</p>
              </Section>
            </div>
          </div>
        </motion.div>
      </MotionConfig>
    )
  }

  return null
}
