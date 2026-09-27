import { NextResponse } from 'next/server'
import { isGuestId, updateGuestRsvp } from '@/lib/data/guests'

export const dynamic = 'force-dynamic'

interface RsvpBody {
  guestId?: unknown
  attending?: unknown
}

/** Only `is_attending` is writable from the public invitation. */
export async function POST(request: Request) {
  let body: RsvpBody

  try {
    body = (await request.json()) as RsvpBody
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  if (!isGuestId(body.guestId)) {
    return NextResponse.json({ error: 'Enlace de invitación inválido.' }, { status: 400 })
  }

  if (typeof body.attending !== 'boolean') {
    return NextResponse.json({ error: 'Respuesta de asistencia inválida.' }, { status: 400 })
  }

  const guest = await updateGuestRsvp(body.guestId, body.attending)

  if (guest === null) {
    return NextResponse.json({ error: 'Invitado no encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ is_attending: guest.is_attending })
}
