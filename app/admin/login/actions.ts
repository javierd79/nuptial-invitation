'use server'

import { redirect } from 'next/navigation'
import { verifyCredentials } from '@/lib/data/users'
import { endSession, roleHome, startSession } from '@/lib/auth/server'

/** Query flags, so failures survive a no-JS form post without any state plumbing. */
const ERROR_MISSING = 'faltan-datos'
const ERROR_INVALID = 'credenciales'

export async function login(formData: FormData): Promise<void> {
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (username === '' || password === '') {
    redirect(`/admin/login?error=${ERROR_MISSING}`)
  }

  const user = await verifyCredentials(username, password)

  if (user === null) {
    redirect(`/admin/login?error=${ERROR_INVALID}`)
  }

  await startSession(user)
  redirect(roleHome(user.role))
}

export async function logout(): Promise<void> {
  await endSession()
  redirect('/admin/login')
}
