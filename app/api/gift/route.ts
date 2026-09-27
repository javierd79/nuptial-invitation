import { NextResponse } from 'next/server'
import { isGuestId, updateGuestGift } from '@/lib/data/guests'
import { GIFT_TYPES, type GiftType, type GuestGiftPatch } from '@/lib/data/types'

export const dynamic = 'force-dynamic'

interface GiftBody {
  guestId?: unknown
  gift_type?: unknown
  gift_description?: unknown
  gift_amount_usd?: unknown
  gift_amount_bs?: unknown
}

const toAmount = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  let text = typeof value === 'number' ? String(value) : String(value).trim()

  // "1.250,50" -> "1250.50" (es-VE); plain decimals like "70.5" are left alone.
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.')

  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100) / 100
}

const toText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed.slice(0, 500)
}

/** Only the gift fields are writable from the public invitation. */
export async function POST(request: Request) {
  let body: GiftBody

  try {
    body = (await request.json()) as GiftBody
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  if (!isGuestId(body.guestId)) {
    return NextResponse.json({ error: 'Enlace de invitación inválido.' }, { status: 400 })
  }

  const giftType = body.gift_type
  if (giftType !== null && !GIFT_TYPES.includes(giftType as GiftType)) {
    return NextResponse.json({ error: 'Tipo de regalo inválido.' }, { status: 400 })
  }

  const patch: GuestGiftPatch = {
    gift_type: giftType as GiftType | null,
    gift_description: toText(body.gift_description),
    gift_amount_usd: toAmount(body.gift_amount_usd),
    gift_amount_bs: toAmount(body.gift_amount_bs),
  }

  const guest = await updateGuestGift(body.guestId, patch)

  if (guest === null) {
    return NextResponse.json({ error: 'Invitado no encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ gift_saved: true })
}
