'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

interface GuestData {
  nombre: string
  acompañantes: number
}

type Phase = 'validating' | 'envelope' | 'video' | 'invitation'

export default function WeddingInvitation() {
  const [phase, setPhase] = useState<Phase>('validating')
  const [guestData, setGuestData] = useState<GuestData | null>(null)
  const [validationError, setValidationError] = useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Mock Supabase validation
  const validateGuest = async () => {
    const params = new URLSearchParams(window.location.search)
    const key = params.get('key')
    const skipTo = params.get('skip')

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
    
    // Handle skip parameter for testing
    if (skipTo === 'invitation') {
      setPhase('invitation')
    } else {
      setPhase('envelope')
    }
  }

  useEffect(() => {
    validateGuest()
  }, [])

  const handleEnvelopeClick = () => {
    setPhase('video')
    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  const handleVideoEnded = () => {
    setPhase('invitation')
  }

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsMusicPlaying(!isMusicPlaying)
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 overflow-hidden">
        <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
          {/* Envelope Image */}
          <div className="w-full h-full relative">
            <img
              src="/letter.png"
              alt="Sobre de invitación"
              className="w-full h-full object-cover rounded-lg shadow-2xl"
            />

            {/* Wax Seal Button */}
            <button
              onClick={handleEnvelopeClick}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                         w-24 h-24 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full 
                         shadow-xl hover:shadow-2xl transition-all duration-300 
                         flex items-center justify-center group cursor-pointer
                         animate-pulse hover:animate-none"
              aria-label="Abrir invitación"
            >
              <div className="absolute inset-0 rounded-full bg-yellow-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <span className="text-4xl">💛</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Video Phase
  if (phase === 'video') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden fixed inset-0">
        <video
          ref={videoRef}
          onEnded={handleVideoEnded}
          className="w-full h-full object-cover animate-fade-in"
          playsInline
        >
          <source src="/letter.mp4" type="video/mp4" />
        </video>
      </div>
    )
  }

  // Invitation Phase
  if (phase === 'invitation' && guestData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 p-4 md:p-8">
        {/* Audio element */}
        <audio ref={audioRef} loop>
          <source
            src="data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=="
            type="audio/wav"
          />
        </audio>

        {/* Music Control Button */}
        <button
          onClick={toggleMusic}
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 
                     text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50
                     flex items-center justify-center hover:scale-110"
          aria-label="Toggle música"
        >
          {isMusicPlaying ? (
            <Volume2 className="w-6 h-6" />
          ) : (
            <VolumeX className="w-6 h-6" />
          )}
        </button>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto py-12 md:py-20 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-800 mb-2">
              Javier Andrés Díaz Toyo
            </h1>
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="h-px w-12 bg-amber-400"></div>
              <span className="text-gray-600 font-light">&</span>
              <div className="h-px w-12 bg-amber-400"></div>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-800">
              Maria Zolis González Alcalá
            </h1>
          </div>

          {/* Personal Message */}
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-8 mb-12 border border-amber-200/50 shadow-lg">
            <p className="text-center text-gray-700 leading-relaxed font-serif text-lg">
              Querido/a{' '}
              <span className="font-bold text-amber-800">{guestData.nombre}</span>,
            </p>
            <p className="text-center text-gray-700 leading-relaxed font-serif text-lg mt-4">
              Nos complace invitarte a compartir este momento especial con nosotros.
            </p>
            <p className="text-center text-gray-600 text-sm mt-6">
              Número de pases válidos: <span className="font-bold text-amber-800">{guestData.acompañantes}</span>
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Date */}
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-amber-200/50 shadow-md text-center">
              <div className="text-3xl mb-2">📅</div>
              <h3 className="font-serif font-bold text-gray-800 mb-2">Fecha</h3>
              <p className="text-gray-600">Sábado, 15 de Noviembre</p>
              <p className="text-sm text-gray-500">del 2025</p>
            </div>

            {/* Time */}
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-amber-200/50 shadow-md text-center">
              <div className="text-3xl mb-2">🕐</div>
              <h3 className="font-serif font-bold text-gray-800 mb-2">Hora</h3>
              <p className="text-gray-600">Ceremonia: 16:30</p>
              <p className="text-sm text-gray-500">Recepción: 18:00</p>
            </div>

            {/* Location */}
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-amber-200/50 shadow-md text-center">
              <div className="text-3xl mb-2">📍</div>
              <h3 className="font-serif font-bold text-gray-800 mb-2">Ubicación</h3>
              <p className="text-gray-600">Hacienda Bella</p>
              <p className="text-sm text-gray-500">Calle Principal 123</p>
            </div>

            {/* Dress Code */}
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-amber-200/50 shadow-md text-center">
              <div className="text-3xl mb-2">👔</div>
              <h3 className="font-serif font-bold text-gray-800 mb-2">Código de Vestimenta</h3>
              <p className="text-gray-600">Formal</p>
              <p className="text-sm text-gray-500">Elegancia Clásica</p>
            </div>
          </div>

          {/* RSVP Section */}
          <div className="bg-gradient-to-r from-amber-100 to-rose-100 rounded-lg p-8 text-center border-2 border-amber-200 shadow-lg">
            <h3 className="font-serif font-bold text-gray-800 text-xl mb-3">
              Confirmación de Asistencia
            </h3>
            <p className="text-gray-700 mb-4">
              Por favor, confirma tu asistencia antes del 1 de Noviembre
            </p>
            <a
              href="mailto:invitaciones@bodajavier-maria.com?subject=Confirmación%20de%20Asistencia"
              className="inline-block bg-gradient-to-b from-amber-400 to-amber-600 text-white font-serif font-bold 
                         py-3 px-8 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              Confirmar Asistencia
            </a>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 pt-8 border-t border-amber-200">
            <p className="text-gray-600 font-serif italic">
              "Que la alegría de este día sea el comienzo de muchos más juntos"
            </p>
            <p className="text-gray-500 text-sm mt-4">
              Con amor, Javier & Maria
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
