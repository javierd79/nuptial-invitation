import WeddingInvitation from '@/components/WeddingInvitation'

interface PageProps {
  searchParams: Promise<{ guest?: string | string[] }>
}

export default async function Page({ searchParams }: PageProps) {
  const { guest } = await searchParams
  const guestId = typeof guest === 'string' ? guest : null

  return <WeddingInvitation guestId={guestId} />
}
