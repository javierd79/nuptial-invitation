'use client'

import { useState, useEffect, useRef } from 'react'

interface GuestData {
  nombre: string
  acompañantes: number
}

type Phase = 'validating' | 'envelope' | 'invitation'

export default function WeddingInvitation() {
  const [phase, setPhase] = useState<Phase>('validating')
  const [guestData, setGuestData] = useState<GuestData | null>(null)
  const [validationError, setValidationError] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Mock Supabase validation
  const validateGuest = async () => {
    const params = new URLSearchParams(window.location.search)
    const key = params.get('key')

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (!key || (key !== '12345' && key !== 'wedding2025')) {
      setValidationError(true)
      setPhase('validating')
      return
    }

    // Mock guest data response
    const mockGuests: { [key: string]: GuestData } = {
      '12345': { nombre: 'Nombre del Invitado', acompañantes: 2 },
      'wedding2025': { nombre: 'Invitado Especial', acompañantes: 3 },
    }

    setGuestData(mockGuests[key] || mockGuests['12345'])
    setPhase('envelope')
  }

  useEffect(() => {
    validateGuest()
  }, [])

  const handleEnvelopeClick = () => {
    setIsVideoPlaying(true)
    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  const handleVideoEnded = () => {
    setIsVideoPlaying(false)
    setPhase('invitation')
  }

  // Validating Phase
  if (phase === 'validating') {
    if (validationError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">✗</span>
              </div>
            </div>
            <h1 className="text-3xl font-serif font-bold text-gray-800 mb-4">
              Acceso Denegado
            </h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Lo sentimos, esta invitación requiere un enlace válido. Por favor, verifica tu correo electrónico
              y asegúrate de tener el enlace correcto.
            </p>
            <div className="bg-white/50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-500">
                Si tienes dudas, contacta con los novios directamente.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 border-4 border-amber-300 border-t-amber-800 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-serif text-lg">
            Validando tu invitación...
          </p>
        </div>
      </div>
    )
  }

  // Envelope Phase
  if (phase === 'envelope' && guestData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 overflow-hidden">
        <div className="w-full max-w-2xl relative aspect-square cursor-pointer" onClick={handleEnvelopeClick}>
          {/* Video Overlay Container */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgb(26, 16, 8)' }}>
            <video
              ref={videoRef}
              onEnded={handleVideoEnded}
              playsInline
              muted
              preload="auto"
              className="w-full h-full object-cover"
            >
              <source src="/letter.mp4" type="video/mp4" />
            </video>

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-30"></div>

            {/* Tap to Open Prompt */}
            {!isVideoPlaying && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none" style={{
                background: 'radial-gradient(rgba(0, 0, 0, 0.35) 0%, transparent 70%)',
              }}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '0.85rem',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: '#ffffff',
                  textShadow: '0 1px 10px rgba(0,0,0,0.6), 0 0 3px rgba(0,0,0,0.4)',
                  userSelect: 'none',
                  margin: 0,
                  paddingBottom: '20%',
                }}>
                  Tap to open
                </p>
                <div style={{
                  width: '28px',
                  height: '1px',
                  background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)',
                }}></div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }



  // Invitation Phase
  if (phase === 'invitation' && guestData) {
    return (
      <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
        {/* Main Content */}
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
          
          {/* Header - Names */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-serif font-light mb-4">
              Javier Andrés
            </h1>
            <h2 className="text-5xl md:text-6xl font-serif font-light">
              & Maria Zolis
            </h2>
          </div>

          {/* Welcome Message */}
          <div className="text-center mb-16">
            <p className="text-lg text-gray-600 font-light leading-relaxed mb-2">
              You are invited
            </p>
            <p className="text-center text-gray-700 font-serif text-xl">
              Querido/a <span className="font-semibold">{guestData.nombre}</span>
            </p>
          </div>

          {/* Scroll Indicator */}
          <div className="text-center mb-12">
            <p className="text-sm tracking-widest text-gray-500 uppercase">
              Scroll to discover
            </p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Save the Date */}
          <div className="text-center mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-8">Save the date</p>
            <div className="text-6xl md:text-7xl font-light tracking-wider font-serif">
              <span>15</span>
              <span className="text-2xl block mt-2">11</span>
              <span className="text-4xl block mt-2">2025</span>
            </div>
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

          {/* Dress Code */}
          <div className="mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-12">Dress Code</p>
            <div className="space-y-6 text-center">
              <div>
                <p className="text-sm text-gray-600 mb-2">Formal Elegance</p>
                <p className="text-gray-800 font-serif text-lg">Classical Elegance</p>
              </div>
              <div className="pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 italic">
                  Black tie and formal attire respectfully requested
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Guest Count */}
          <div className="mb-20 text-center">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-4">Guest Count</p>
            <p className="text-4xl font-serif font-light">{guestData.acompañantes}</p>
            <p className="text-xs text-gray-600 mt-4">Plus ones included</p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* RSVP Section */}
          <div className="text-center mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-8">RSVP</p>
            <p className="text-gray-700 mb-6">
              Please respond by November 1, 2025
            </p>
            <a
              href="mailto:invitaciones@bodajavier-maria.com?subject=Confirmación%20de%20Asistencia"
              className="inline-block px-8 py-3 border border-gray-900 text-gray-900 font-serif hover:bg-gray-900 hover:text-white transition-all duration-300"
            >
              Confirm Attendance
            </a>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Closing Message */}
          <div className="text-center py-12">
            <p className="text-sm text-gray-600 italic mb-4">
              "May the joy of this day be the beginning of many more together"
            </p>
            <p className="text-gray-700 font-serif">
              With love,
            </p>
            <p className="text-gray-700 font-serif">
              Javier & Maria
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
