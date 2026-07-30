'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/admin/login')
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse">
          <div className="w-px h-12 bg-gray-300 mx-auto mb-4"></div>
        </div>
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  )
}
