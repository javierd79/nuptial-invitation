'use client'

import { useFormStatus } from 'react-dom'

export default function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full border border-ink bg-ink py-3 font-serif text-sm uppercase tracking-[0.25em] text-ivory transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  )
}
