import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/server'
import type { SessionUser } from '@/lib/data/types'

/** Shared guard for every `/api/admin/*` route. */
export async function requireAdminApi(): Promise<
  { user: SessionUser; response: null } | { user: null; response: NextResponse }
> {
  const user = await getSessionUser()

  if (user === null) {
    return {
      user: null,
      response: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }),
    }
  }

  return { user, response: null }
}
