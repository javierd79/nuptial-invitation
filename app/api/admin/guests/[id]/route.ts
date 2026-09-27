import { NextResponse } from 'next/server'
import { requireAdminApi } from '../../guard'
import { deleteGuest, isGuestId, updateGuest } from '@/lib/data/guests'
import { GENDERS, type AdminGuestPatch, type Gender } from '@/lib/data/types'

export const dynamic = 'force-dynamic'

interface PatchBody {
  full_name?: unknown
  email?: unknown
  gender?: unknown
  plus_ones?: unknown
  is_courtesy?: unknown
  courtesy_plus_ones?: unknown
  is_godparent?: unknown
  is_attending?: unknown
  phone?: unknown
}

const toCount = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0
}

const toNullableText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed.slice(0, 120)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.response !== null) return auth.response

  const { id } = await params
  if (!isGuestId(id)) {
    return NextResponse.json({ error: 'Identificador de invitado inválido.' }, { status: 400 })
  }

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  const patch: AdminGuestPatch = {}

  if (body.full_name !== undefined) {
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    if (fullName === '') {
      return NextResponse.json({ error: 'El nombre no puede quedar vacío.' }, { status: 400 })
    }
    patch.full_name = fullName
  }

  if (body.email !== undefined) {
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (email === '') {
      return NextResponse.json({ error: 'El correo no puede quedar vacío.' }, { status: 400 })
    }
    patch.email = email
  }

  if (body.gender !== undefined) {
    if (body.gender !== null && !GENDERS.includes(body.gender as Gender)) {
      return NextResponse.json({ error: 'Sexo inválido.' }, { status: 400 })
    }
    patch.gender = body.gender as Gender | null
  }
  if (body.plus_ones !== undefined) patch.plus_ones = toCount(body.plus_ones)
  if (body.is_courtesy !== undefined) patch.is_courtesy = body.is_courtesy === true
  if (body.courtesy_plus_ones !== undefined) patch.courtesy_plus_ones = toCount(body.courtesy_plus_ones)
  if (body.is_godparent !== undefined) patch.is_godparent = body.is_godparent === true
  if (body.is_attending !== undefined) {
    patch.is_attending = typeof body.is_attending === 'boolean' ? body.is_attending : null
  }
  if (body.phone !== undefined) patch.phone = toNullableText(body.phone)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No hay cambios que aplicar.' }, { status: 400 })
  }

  const guest = await updateGuest(id, patch)

  if (guest === null) {
    return NextResponse.json({ error: 'Invitado no encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ guest })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if (auth.response !== null) return auth.response

  const { id } = await params
  if (!isGuestId(id)) {
    return NextResponse.json({ error: 'Identificador de invitado inválido.' }, { status: 400 })
  }

  if (!(await deleteGuest(id))) {
    return NextResponse.json({ error: 'Invitado no encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ deleted: true })
}
