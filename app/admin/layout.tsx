import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import AdminPwa from '@/components/AdminPwa'

export const metadata: Metadata = {
  title: 'Admin',
  manifest: '/manifest-admin.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Protocolo',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#2b2723',
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminPwa />
      {children}
    </>
  )
}
