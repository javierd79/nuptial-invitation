import type { UserRole } from '@/lib/data/types'

export const SESSION_COOKIE = 'admin_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export interface SessionPayload {
  /** Username. */
  u: string
  /** Role. */
  r: UserRole
  /** Expiry, as a Unix timestamp in seconds. */
  exp: number
}

/** Home route for each role inside the admin area. */
export function roleHome(role: UserRole): string {
  return role === 'ADMIN' ? '/admin/dashboard' : '/admin/dashboard'
}
