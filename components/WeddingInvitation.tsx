'use client'

import { useState, useEffect, useRef } from 'react'

interface GuestData {
  nombre: string
  acompañantes: number
}

type Phase = 'validating' | 'envelope' | 'video' | 'invitation'

export default function WeddingInvitation() {
  const [phase, setPhase] = useState<Phase>('validating')
  const [guestData, setGuestData] = useState<GuestData | null>(null)
  const [validationError, setValidationError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const invitationRef = useRef<HTMLDivElement>(null)

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

  // Validating Phase
  if (phase === 'validating') {
    if (validationError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-6">
          <div className="max-w-md w-full">
            <div className="text-center mb-12">
              <div className="w-1 h-12 bg-gray-300 mx-auto mb-8"></div>
              <h1 className="text-4xl font-serif font-light text-gray-900 mb-6">
                Access Denied
              </h1>
              <div className="w-px h-8 bg-gray-200 mx-auto mb-8"></div>
            </div>

            <div className="space-y-8 text-center">
              <p className="text-sm text-gray-600 font-light leading-relaxed">
                We're sorry, but this invitation requires a valid access code. 
                Please check your email to ensure you have the correct link.
              </p>

              <div className="pt-8 border-t border-gray-200">
                <p className="text-xs tracking-widest text-gray-500 uppercase mb-4">
                  Need help?
                </p>
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
          {/* Logo/Icon Area */}
          <div className="mb-16">
            <div className="flex justify-center mb-8">
              <div className="relative w-12 h-12">
                <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
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
                  <path
                    d="M50 30 L65 45 L50 60 L35 45 Z"
                    fill="currentColor"
                    opacity="0.6"
                  />
                </svg>
              </div>
            </div>

            <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>
          </div>

          {/* Loading Message */}
          <p className="text-sm tracking-widest text-gray-500 uppercase mb-2">
            Please wait
          </p>
          <p className="text-gray-700 font-serif text-lg font-light">
            Validating your invitation
          </p>

          {/* Animated dots */}
          <div className="mt-8 flex justify-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
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
      <div ref={invitationRef} className="min-h-screen bg-white text-gray-900 overflow-x-hidden animate-in fade-in duration-700">
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
                  <p className="text-sm font-serif font-light text-gray-800">
                    Black tie & dinner jacket
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* About the Celebration */}
          <div className="mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-8">The Celebration</p>
            <p className="text-center text-gray-700 leading-relaxed font-serif text-lg mb-6">
              &quot;In a moment of pure joy, we gather to celebrate love&apos;s greatest promise. Join us for an evening of elegance, warmth, and unforgettable moments.&quot;
            </p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* Guest Count */}
          <div className="mb-20 text-center">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-4">Party Size</p>
            <p className="text-4xl font-serif font-light">{guestData.acompañantes}</p>
            <p className="text-xs text-gray-600 mt-4">guests</p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-300 mx-auto mb-12"></div>

          {/* RSVP Section */}
          <div className="text-center mb-20">
            <p className="text-sm tracking-widest text-gray-500 uppercase mb-8">RSVP</p>
            <p className="text-gray-700 mb-2 text-sm">
              Are you attending?
            </p>
            <p className="text-gray-600 mb-8 text-xs">
              Please respond by October 15, 2025
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 border border-gray-900 text-gray-900 font-serif hover:bg-gray-900 hover:text-white transition-all duration-300">
                I will attend
              </button>
              <button className="px-8 py-3 border border-gray-300 text-gray-600 font-serif hover:bg-gray-100 transition-all duration-300">
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
