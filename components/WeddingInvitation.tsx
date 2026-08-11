'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GuestData {
  id: string
  full_name: string
  email: string
  plus_ones: number
  gift_description: string | null
  is_godparent: boolean
  is_attending: boolean | null
}

interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
}

type Phase = 'validating' | 'envelope' | 'video' | 'invitation'

const WEDDING_DATE = new Date('2025-11-15T17:00:00').getTime()

const COUPLE_IMAGES = [
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.19%20PM-YUDyt5Ux4zitm5Csn35x4p7GsP94mi.jpeg',
    alt: 'Javier y Maria compartiendo un beso junto al árbol de Navidad',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.16%20PM-4PJ7c0Y8I56UympLmCPigCYuJPrKSw.jpeg',
    alt: 'Retrato cercano de Javier y Maria sonriendo juntos',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.01.05%20PM-yFIl4CXFF1zcYXAzVU6bmZdT6AYEtI.jpeg',
    alt: 'Maria mostrando su anillo mientras sostiene un ramo de rosas',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.18%20PM-xNi0qVQufN1w5sYrXcG5RC4t5Z5eYK.jpeg',
    alt: 'Javier y Maria posando juntos en casa',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.18%20PM%20%281%29-p9vyEqovAWhMR9MV23l5tjEEGz1qbD.jpeg',
    alt: 'Javier y Maria sonriendo durante un momento cotidiano',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.14%20PM-tJQvdXwlD3dIzohQkCsjmmRlWpJPQo.jpeg',
    alt: 'Javier y Maria en un retrato íntimo',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-05%20at%207.03.20%20PM-2Upv1xEwoYco3Sj7mp45wcXHNPclql.jpeg',
    alt: 'Javier y Maria juntos durante una noche al aire libre',
  },
]

export default function WeddingInvitation() {
  const [phase, setPhase] = useState<Phase>('validating')
  const [guestData, setGuestData] = useState<GuestData | null>(null)
  const [validationError, setValidationError] = useState(false)
  const [countdown, setCountdown] = useState<Countdown>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })
  const videoRef = useRef<HTMLVideoElement>(null)
  const invitationRef = useRef<HTMLDivElement>(null)

  // Calculate countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const distance = WEDDING_DATE - now

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
  const validateGuest = async () => {
    const params = new URLSearchParams(window.location.search)
    const guestId = params.get('guest')

    if (!guestId) {
      setValidationError(true)
      setPhase('validating')
      return
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
        setPhase('validating')
        return
      }

      setGuestData(data as GuestData)
      setPhase('envelope')
    } catch (err) {
      console.error('[v0] Error validating guest:', err)
      setValidationError(true)
      setPhase('validating')
    }
  }

  useEffect(() => {
    validateGuest()
  }, [])

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
    if (!guestData) return

    try {
      const supabase = createClient()
      await supabase.from('guests').update({ is_attending: attending }).eq('id', guestData.id)

      setGuestData({ ...guestData, is_attending: attending })
    } catch (err) {
      console.error('[v0] Error updating RSVP:', err)
    }
  }

  // Validating Phase
  if (phase === 'validating') {
    if (validationError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-6">
          <div className="max-w-md w-full">
            <div className="text-center mb-12">
              <div className="w-1 h-12 bg-gray-300 mx-auto mb-8"></div>
              <h1 className="text-4xl font-serif font-light text-gray-900 mb-6">Access Denied</h1>
              <div className="w-px h-8 bg-gray-200 mx-auto mb-8"></div>
            </div>

            <div className="space-y-8 text-center">
              <p className="text-sm text-gray-600 font-light leading-relaxed">
                We&apos;re sorry, but this invitation requires a valid access code. Please check your
                email to ensure you have the correct link.
              </p>

              <div className="pt-8 border-t border-gray-200">
                <p className="text-xs tracking-widest text-gray-500 uppercase mb-4">Need help?</p>
                <p className="text-sm text-gray-600 font-light">
                  Contact the couple directly for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
        <div className="text-center max-w-md">
          <div className="mb-16">
            <div className="flex justify-center mb-8">
              <div className="relative w-12 h-12">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.2"
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
                    className="animate-pulse"
                    style={{
                      animation: 'spin 3s linear infinite',
                    }}
                  />
                  <path d="M50 30 L65 45 L50 60 L35 45 Z" fill="currentColor" opacity="0.6" />
                </svg>
              </div>
            </div>

            <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>
          </div>

          <p className="text-sm tracking-widest text-gray-500 uppercase mb-2">Please wait</p>
          <p className="text-gray-700 font-serif text-lg font-light">
            Validating your invitation
          </p>

          <div className="mt-8 flex justify-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
              style={{ animationDelay: '0.2s' }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
              style={{ animationDelay: '0.4s' }}
            ></div>
          </div>
        </div>
      </div>
    )
  }

  // Envelope Phase
  if (phase === 'envelope' && guestData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 overflow-hidden">
        <div className="w-full max-w-2xl relative aspect-square cursor-pointer" onClick={handleEnvelopeClick}>
          <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgb(26, 16, 8)' }}>
            <video
              preload="auto"
              playsInline
              muted
              className="w-full h-full object-cover"
            >
              <source src="/letter.mp4" type="video/mp4" />
            </video>

            <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-30"></div>

            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none"
              style={{
                background: 'radial-gradient(rgba(0, 0, 0, 0.35) 0%, transparent 70%)',
              }}
            >
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
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
                Tap to open
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
        </div>
      </div>
    )
  }

  // Video Phase - Fullscreen
  if (phase === 'video' && guestData) {
    return (
      <div className="fixed inset-0 w-full h-full bg-black z-50 flex items-center justify-center animate-in fade-in duration-300">
        <video
          ref={videoRef}
          onEnded={handleVideoEnded}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        >
          <source src="/letter.mp4" type="video/mp4" />
        </video>
      </div>
    )
  }

  // Invitation Phase
  if (phase === 'invitation' && guestData) {
    return (
      <div
        ref={invitationRef}
        className="min-h-screen bg-white text-gray-900 overflow-x-hidden animate-in fade-in duration-700"
      >
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
          {/* Header - Names */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-serif font-light mb-4">
              Javier Andrés
            </h1>
            <h2 className="text-5xl md:text-6xl font-serif font-light">& Maria Zolis</h2>
          </div>

          {/* Welcome Message */}
          <div className="text-center mb-16">
            <p className="text-lg text-gray-600 font-light leading-relaxed mb-2">
              You are invited
            </p>
            <p className="text-center text-gray-700 font-serif text-xl">
              Querido/a <span className="font-semibold">{guestData.full_name}</span>
            </p>
          </div>

          {/* Scroll Indicator */}
          <div className="text-center mb-12">
            <p className="text-sm tracking-widest text-gray-500 uppercase">Scroll to discover</p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Countdown */}
          <div className="text-center mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-8">Time until celebration</p>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-serif font-light">{countdown.days}</p>
                <p className="text-xs tracking-widest text-gray-500 uppercase mt-2">Days</p>
              </div>
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-serif font-light">{countdown.hours}</p>
                <p className="text-xs tracking-widest text-gray-500 uppercase mt-2">Hours</p>
              </div>
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-serif font-light">{countdown.minutes}</p>
                <p className="text-xs tracking-widest text-gray-500 uppercase mt-2">Minutes</p>
              </div>
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-serif font-light">{countdown.seconds}</p>
                <p className="text-xs tracking-widest text-gray-500 uppercase mt-2">Seconds</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 font-light">
              Saturday, November 15, 2025
            </p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Ceremony Details */}
          <div className="mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-12">The Ceremony</p>
            <div className="space-y-8">
              <div>
                <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">Time</p>
                <p className="text-2xl font-serif font-light">16:30</p>
                <p className="text-sm text-gray-600 mt-1">Ceremony begins</p>
              </div>
              <div>
                <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">Location</p>
                <p className="text-lg font-serif font-light">Hacienda Bella</p>
                <p className="text-sm text-gray-600">Calle Principal 123</p>
              </div>
              <div>
                <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">Reception</p>
                <p className="text-lg font-serif font-light">18:00</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Wedding Program */}
          <div className="mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-12">The Day</p>
            <div className="space-y-6">
              {[
                { time: '16:30', label: 'Arrival' },
                { time: '17:00', label: 'Ceremony' },
                { time: '18:30', label: 'Cocktail & Reception' },
                { time: '20:00', label: 'Dinner' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <p className="text-sm font-serif font-light">{item.label}</p>
                  <p className="text-gray-600 text-sm">{item.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Dress Code */}
          <div className="mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-12">Dress Code</p>
            <div className="space-y-8">
              <p className="text-center text-sm text-gray-700 italic">
                Formal attire respectfully requested. Let elegance guide your choice.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-center">
                  <p className="text-xs tracking-widest text-gray-500 uppercase mb-3">For Her</p>
                  <p className="text-sm font-serif font-light text-gray-800">
                    Floor-length gown or elegant formal dress
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs tracking-widest text-gray-500 uppercase mb-3">For Him</p>
                  <p className="text-sm font-serif font-light text-gray-800">Black tie & dinner jacket</p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Guest Info */}
          <div className="mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-12">Your Details</p>
            <div className="space-y-8">
              <div>
                <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">Plus Ones</p>
                <p className="text-2xl font-serif font-light">{guestData.plus_ones}</p>
              </div>
              {guestData.is_godparent && (
                <div>
                  <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">Role</p>
                  <p className="text-lg font-serif font-light text-amber-700">Godparent of the Wedding</p>
                </div>
              )}
              {guestData.gift_description && (
                <div>
                  <p className="text-xs tracking-widest text-gray-500 uppercase mb-2">Gift</p>
                  <p className="text-sm font-serif font-light text-gray-800">{guestData.gift_description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* About the Celebration */}
          <div className="mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-8">The Celebration</p>
            <p className="text-center text-gray-700 leading-relaxed font-serif text-lg mb-6">
              &quot;In a moment of pure joy, we gather to celebrate love&apos;s greatest promise. Join us
              for an evening of elegance, warmth, and unforgettable moments.&quot;
            </p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Our Story */}
          <section className="mb-20" aria-labelledby="our-story-title">
            <div className="mb-10 text-center">
              <p className="text-sm tracking-widest text-gray-500 uppercase mb-4">Our Story</p>
              <h2 id="our-story-title" className="font-serif text-3xl md:text-4xl font-light text-gray-900">
                Moments that brought us here
              </h2>
              <p className="mt-4 text-sm text-gray-600 font-light leading-relaxed">
                A few memories from the beautiful journey we share with you.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4" role="list" aria-label="Photos of Javier and Maria">
              <figure className="col-span-2 overflow-hidden rounded-[2rem] bg-gray-100" role="listitem">
                <img
                  src={COUPLE_IMAGES[0].src}
                  alt={COUPLE_IMAGES[0].alt}
                  loading="lazy"
                  className="h-[25rem] w-full object-cover object-center transition-transform duration-700 hover:scale-[1.03] md:h-[32rem]"
                />
              </figure>
              {COUPLE_IMAGES.slice(1, 5).map((image) => (
                <figure key={image.src} className="overflow-hidden rounded-2xl bg-gray-100" role="listitem">
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-[1.04]"
                  />
                </figure>
              ))}
              <figure className="overflow-hidden rounded-2xl bg-gray-100" role="listitem">
                <img
                  src={COUPLE_IMAGES[5].src}
                  alt={COUPLE_IMAGES[5].alt}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-[1.04]"
                />
              </figure>
              <figure className="overflow-hidden rounded-2xl bg-gray-100" role="listitem">
                <img
                  src={COUPLE_IMAGES[6].src}
                  alt={COUPLE_IMAGES[6].alt}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover object-center transition-transform duration-700 hover:scale-[1.04]"
                />
              </figure>
            </div>
          </section>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* RSVP Section */}
          <div className="text-center mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-8">RSVP</p>
            <p className="text-gray-700 mb-2 text-sm">Are you attending?</p>
            <p className="text-gray-600 mb-8 text-xs">
              Please respond by October 15, 2025
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleRSVP(true)}
                disabled={guestData.is_attending !== null}
                className={`px-8 py-3 border font-serif transition-all duration-300 ${
                  guestData.is_attending === true
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white disabled:opacity-50'
                }`}
              >
                I will attend
              </button>
              <button
                onClick={() => handleRSVP(false)}
                disabled={guestData.is_attending !== null}
                className={`px-8 py-3 border font-serif transition-all duration-300 ${
                  guestData.is_attending === false
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50'
                }`}
              >
                Unable to attend
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Closing Message */}
          <div className="text-center py-12">
            <p className="text-sm text-gray-600 italic mb-4">
              "May the joy of this day be the beginning of many more together"
            </p>
            <p className="text-gray-700 font-serif">With love,</p>
            <p className="text-gray-700 font-serif">Javier & Maria</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
