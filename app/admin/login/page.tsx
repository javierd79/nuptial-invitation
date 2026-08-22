'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserWithRole, roleHome } from '@/lib/auth'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      const user = await getUserWithRole(supabase)

      if (!user) {
        await supabase.auth.signOut()
        setError('Usuario sin rol asignado. Contacta al administrador.')
        setLoading(false)
        return
      }

      router.push(roleHome(user.role))
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  const labelClasses = 'font-serif text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint'
  const inputClasses =
    'mt-2 w-full border-b border-ink/20 bg-transparent pb-2 font-serif text-lg font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none'

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory p-6 text-ink">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-8 h-12 w-px bg-ink/20" />
          <h1 className="font-serif text-4xl font-light tracking-[-0.01em] text-ink">
            Acceso administrativo
          </h1>
          <p className="mt-3 font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
            Javier &amp; Maria · Invitación
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <label className="block">
            <span className={labelClasses}>Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@correo.com"
              className={inputClasses}
            />
          </label>

          <label className="block">
            <span className={labelClasses}>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClasses}
            />
          </label>

          {error && (
            <div className="border border-red-700/25 bg-red-700/10 px-5 py-4 font-serif text-sm text-red-700/80">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-ink bg-ink py-3 font-serif text-sm uppercase tracking-[0.25em] text-ivory transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="mt-12 border-t border-ink/10 pt-8 text-center">
          <p className="font-serif text-xs uppercase tracking-[0.3em] text-ink-faint">
            Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
