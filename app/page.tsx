import type { Metadata } from 'next'
import { headers } from 'next/headers'
import WeddingInvitation from '@/components/WeddingInvitation'

interface PageProps {
  searchParams: Promise<{ guest?: string | string[] }>
}

const OG_TITLE = 'Javier Andrés & Maria Zolis · Nos casamos'
const OG_DESCRIPTION =
  'Sábado, 12 de septiembre de 2026. Abre tu invitación y confirma tu asistencia.'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (host ? `${proto}://${host}` : `https://${process.env.VERCEL_URL ?? 'localhost:3000'}`)

  return {
    metadataBase: new URL(base),
    openGraph: {
      type: 'website',
      url: '/',
      siteName: 'Javier & Maria',
      locale: 'es_VE',
      title: OG_TITLE,
      description: OG_DESCRIPTION,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Carta de invitación de Javier & Maria',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: OG_TITLE,
      description: OG_DESCRIPTION,
      images: ['/og-image.jpg'],
    },
  }
}

export default async function Page({ searchParams }: PageProps) {
  const { guest } = await searchParams
  const guestId = typeof guest === 'string' ? guest : null

  return <WeddingInvitation guestId={guestId} />
}
