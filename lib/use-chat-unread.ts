'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { AuthUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import {
  GROUP_ROOM_ID,
  displayName,
  dmRoomId,
  type ChatProfile,
} from '@/lib/chat'
import type { GuestChangeToast } from '@/lib/use-guest-change-notifications'

const TOAST_MS = 3000

export function useChatUnread({ user }: { user: AuthUser | null }) {
  const pathname = usePathname()
  const [total, setTotal] = useState(0)
  const [byRoom, setByRoom] = useState<Record<string, number>>({})
  const [toasts, setToasts] = useState<GuestChangeToast[]>([])
  const profilesRef = useRef<ChatProfile[]>([])
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const recompute = useCallback(async () => {
    if (!user) {
      setTotal(0)
      setByRoom({})
      return
    }
    const supabase = createClient()

    const { data: profiles } = await supabase.from('chat_profiles').select('*')
    profilesRef.current = (profiles ?? []) as ChatProfile[]

    const rooms = [
      GROUP_ROOM_ID,
      ...profilesRef.current
        .filter((p) => p.user_id !== user.id)
        .map((p) => dmRoomId(user.id, p.user_id)),
    ]

    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id, room_id, sender_id')
      .in('room_id', rooms)
      .order('created_at', { ascending: false })
      .limit(200)

    const list = (messages ?? []) as { id: string; room_id: string; sender_id: string }[]
    if (list.length === 0) {
      setTotal(0)
      setByRoom({})
      return
    }

    const { data: readStatuses } = await supabase
      .from('chat_message_status')
      .select('message_id')
      .eq('user_id', user.id)
      .in('message_id', list.map((m) => m.id))
      .not('read_at', 'is', null)

    const readSet = new Set(((readStatuses ?? []) as { message_id: string }[]).map((s) => s.message_id))
    let count = 0
    const counts: Record<string, number> = {}
    for (const message of list) {
      if (message.sender_id === user.id || readSet.has(message.id)) continue
      count++
      counts[message.room_id] = (counts[message.room_id] ?? 0) + 1
    }
    setTotal(count)
    setByRoom(counts)
  }, [user])

  useEffect(() => {
    void recompute()
  }, [recompute])

  useEffect(() => {
    if (!user) return

    const onFocus = () => void recompute()
    window.addEventListener('focus', onFocus)

    const timer = setInterval(onFocus, 60_000)

    const supabase = createClient()
    const channel = supabase
      .channel('chat-unread-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = payload.new as { id: string; room_id: string; sender_id: string; body: string }
          if (!row || row.sender_id === user.id) return

          if (pathnameRef.current === '/admin/chat') return

          setTotal((current) => current + 1)
          setByRoom((current) => ({
            ...current,
            [row.room_id]: (current[row.room_id] ?? 0) + 1,
          }))

          const profile = profilesRef.current.find((p) => p.user_id === row.sender_id)
          const toast: GuestChangeToast = {
            id: row.id,
            kind: 'chat',
            text: `${displayName(profile)}: ${String(row.body).slice(0, 80)}`,
          }
          setToasts((current) => [...current.slice(-3), toast])
          setTimeout(() => dismissToast(toast.id), TOAST_MS)
        },
      )
      .subscribe()

    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [user, recompute, dismissToast])

  return { total, byRoom, toasts, dismissToast, refresh: recompute }
}
