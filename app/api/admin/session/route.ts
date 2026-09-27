import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()

  if (user === null) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({ user })
}
