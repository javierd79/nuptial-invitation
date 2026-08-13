'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/admin/login')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory text-ink">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-px animate-pulse bg-ink/20" />
        <p className="font-serif text-sm italic text-ink-soft">Redirigiendo a acceso…</p>
      </div>
    </div>
  )
}
