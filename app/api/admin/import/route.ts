import { NextResponse } from 'next/server'
import { requireAdminApi } from '../guard'
import { replaceGuests } from '@/lib/data/guests'

export const dynamic = 'force-dynamic'

/**
 * One-shot migration: posts the `invitados.json` produced by
 * `bun run export` and it replaces the current guest list wholesale.
 * Existing UUIDs are preserved, so links already sent out keep working.
 */
export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if (auth.response !== null) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  const rows = Array.isArray(body) ? body : null
  if (rows === null) {
    return NextResponse.json(
      { error: 'Se espera un arreglo de invitados.' },
      { status: 400 },
    )
  }

  const { imported, skipped } = await replaceGuests(rows)
  return NextResponse.json({ imported, skipped })
}
