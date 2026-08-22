import type { SupabaseClient } from '@supabase/supabase-js'

export const USER_ROLES = ['ADMIN', 'PROTOCOL'] as const

export type UserRole = (typeof USER_ROLES)[number]

export interface AuthUser {
  id: string
  email: string | undefined
  role: UserRole
}

const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)

/**
 * Returns the signed-in user with their assigned role, or null when there is
 * no session or the user has no valid role ('ADMIN' | 'PROTOCOL') in their
 * auth metadata.
 */
export async function getUserWithRole(
  supabase: SupabaseClient,
): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const role = user.user_metadata?.role
  if (!isUserRole(role)) return null

  return { id: user.id, email: user.email, role }
}

/** Home route for each role inside the admin area. */
export function roleHome(role: UserRole): string {
  return role === 'ADMIN' ? '/admin/dashboard' : '/admin/protocol'
}
