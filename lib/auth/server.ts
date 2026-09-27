import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { findUser } from '@/lib/data/users'
import type { SessionUser } from '@/lib/data/types'
import {
  createSessionToken,
  sessionExpiry,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from './session'

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './session'
export { roleHome } from './types'

/**
 * The signed-in admin, or null. The user is looked up in `data/usuarios.json`
 * on every request, so removing an account from that file revokes access
 * immediately instead of waiting for the cookie to expire.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const payload = await verifySessionToken(store.get(SESSION_COOKIE)?.value)
  if (payload === null) return null

  const user = await findUser(payload.u)
  if (user === null) return null

  return { username: user.username, role: user.role }
}

/** Same check, but sends unauthenticated visitors to the login page. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (user === null) redirect('/admin/login')
  return user
}

export async function startSession(user: SessionUser): Promise<void> {
  const token = await createSessionToken({
    u: user.username,
    r: user.role,
    exp: sessionExpiry(),
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
