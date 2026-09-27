import { NextResponse } from 'next/server'
import { requireAdminApi } from '../guard'
import { createGuest, DuplicateEmailError, getGuests } from '@/lib/data/guests'
import { GENDERS, type CreateGuestInput, type Gender } from '@/lib/data/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminApi()
  if (auth.response !== null) return auth.response

  return NextResponse.json({ guests: await getGuests() })
}

interface CreateBody {
  full_name?: unknown
  email?: unknown
  gender?: unknown
  plus_ones?: unknown
  is_courtesy?: unknown
  courtesy_plus_ones?: unknown
  is_godparent?: unknown
}

const toCount = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (auth.response !== null) return auth.response

  let body: CreateBody
  try {
    body = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (fullName === '') {
    return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
  }

  if (email === '') {
    return NextResponse.json({ error: 'El correo es obligatorio.' }, { status: 400 })
  }

  const isCourtesy = body.is_courtesy === true
  const input: CreateGuestInput = {
    full_name: fullName,
    email,
    gender: GENDERS.includes(body.gender as Gender) ? (body.gender as Gender) : null,
    plus_ones: toCount(body.plus_ones),
    is_courtesy: isCourtesy,
    courtesy_plus_ones: isCourtesy ? toCount(body.courtesy_plus_ones) : 0,
    is_godparent: body.is_godparent === true,
  }

  try {
    return NextResponse.json({ guest: await createGuest(input) }, { status: 201 })
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    throw error
  }
}
