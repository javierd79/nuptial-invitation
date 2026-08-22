'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { UserRole } from '@/lib/auth'
import { describeGuestChange, type ChangeGuest, type GuestChangeKind } from '@/lib/guest-changes'

export interface GuestChangeToast {
  id: string
  kind: GuestChangeKind
  text: string
}

const TOAST_MS = 3000
const MAX_TOASTS = 4

export function useGuestChangeNotifications({
  guests,
  role,
}: {
  guests: ChangeGuest[]
  role: UserRole | null
}) {
  const [toasts, setToasts] = useState<GuestChangeToast[]>([])
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const prevMapRef = useRef<Map<string, ChangeGuest> | null>(null)

  useEffect(() => {
    setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const previous = prevMapRef.current
    prevMapRef.current = new Map(guests.map((g) => [g.id, g]))

    if (!previous || !role) return

    const created: GuestChangeToast[] = []
    for (const guest of guests) {
      const prev = previous.get(guest.id)
      if (!prev) continue

      for (const message of describeGuestChange(prev, guest)) {
        if (role === 'PROTOCOL' && message.kind !== 'rsvp') continue
        created.push({ id: message.id, kind: message.kind, text: message.text })
      }
    }

    if (created.length === 0) return

    setToasts((current) => {
      const knownIds = new Set(current.map((t) => t.id))
      const fresh = created.filter((t) => !knownIds.has(t.id))
      if (fresh.length === 0) return current
      return [...current, ...fresh].slice(-MAX_TOASTS)
    })

    if (
      typeof document !== 'undefined' &&
      document.hidden &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      for (const toast of created) {
        try {
          const notification = new Notification('Javier & Maria', {
            body: toast.text,
            icon: '/web-app-manifest-192x192.png',
            tag: toast.id,
          })
          notification.onclick = () => {
            window.focus()
            notification.close()
          }
        } catch {}
      }
    }

    const timers = created.map((toast) =>
      setTimeout(() => dismissToast(toast.id), TOAST_MS),
    )
    return () => timers.forEach(clearTimeout)
  }, [guests, role, dismissToast])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch {
      return null
    }
  }, [])

  return { toasts, dismissToast, permission, requestPermission }
}
