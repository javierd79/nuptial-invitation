import type { Metadata } from 'next'
import WeddingInvitation from '@/components/WeddingInvitation'
import { createClient } from '@/lib/supabase/server'
import {
  OG_IMAGE,
  SITE_URL,
  WEDDING_DESCRIPTION,
  WEDDING_TITLE,
} from '@/lib/site'

interface PageProps {
  searchParams: Promise<{ guest?: string | string[] }>
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getGuestId(value: string | string[] | undefined) {
  const guestId = typeof value === 'string' ? value : null
  return guestId && UUID_PATTERN.test(guestId) ? guestId : null
}

function getInvitationUrl(guestId: string | null) {
  const url = new URL('/', SITE_URL)
  if (guestId) url.searchParams.set('guest', guestId)
  return url
}

async function getGuestName(guestId: string | null) {
  if (!guestId) return null

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('guests')
      .select('full_name')
      .eq('id', guestId)
      .maybeSingle()

    const name = data?.full_name?.trim().replace(/\s+/g, ' ').slice(0, 80)
    return name || null
  } catch {
    return null
  }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { guest } = await searchParams
  const guestId = getGuestId(guest)
  const guestName = await getGuestName(guestId)
  const title = guestName ? `${guestName}, estás invitado a nuestra boda` : WEDDING_TITLE
  const description = guestName
    ? `${guestName}, queremos compartir contigo nuestro día más especial. ${WEDDING_DESCRIPTION}`
    : WEDDING_DESCRIPTION
  const invitationUrl = getInvitationUrl(guestId)
  const imageUrl = new URL(OG_IMAGE, SITE_URL).toString()

  return {
    title,
    description,
    alternates: { canonical: invitationUrl.toString() },
    openGraph: {
      type: 'website',
      url: invitationUrl.toString(),
      siteName: 'Javier & Maria',
      locale: 'es_VE',
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'Carta de invitación de Javier & Maria',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    robots: { index: true, follow: true },
  }
}

export default async function Page({ searchParams }: PageProps) {
  const { guest } = await searchParams
  return <WeddingInvitation guestId={getGuestId(guest)} />
}
