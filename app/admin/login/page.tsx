import { login } from './actions'
import SubmitButton from './submit-button'

const ERRORS: Record<string, string> = {
  'faltan-datos': 'Usuario y contraseña son obligatorios.',
  credenciales: 'Usuario o contraseña incorrectos.',
}

const LABEL = 'font-serif text-[0.65rem] uppercase tracking-[0.3em] text-ink-faint'
const INPUT =
  'mt-2 w-full border-b border-ink/20 bg-transparent pb-2 font-serif text-lg font-light text-ink placeholder:text-ink/25 focus:border-brass focus:outline-none'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const message = error === undefined ? undefined : ERRORS[error]

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

        <form action={login} className="space-y-8">
          <label className="block">
            <span className={LABEL}>Usuario</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="admin"
              className={INPUT}
            />
          </label>

          <label className="block">
            <span className={LABEL}>Contraseña</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className={INPUT}
            />
          </label>

          {message !== undefined && (
            <div className="border border-red-700/25 bg-red-700/10 px-5 py-4 font-serif text-sm text-red-700/80">
              {message}
            </div>
          )}

          <SubmitButton />
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
