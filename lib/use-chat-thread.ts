'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessage, ChatMessageStatus, MessageWithStatuses } from '@/lib/chat'

type Tick = 'sent' | 'delivered' | 'read'

const PAGE_SIZE = 100

export function tickFor(
  message: MessageWithStatuses,
  meId: string,
  participantIds: string[],
): Tick {
  const others = participantIds.filter((id) => id !== meId)
  if (others.length === 0) return 'sent'

  const byUser = new Map((message.statuses ?? []).map((s) => [s.user_id, s]))
  const allDelivered = others.every((id) => byUser.get(id)?.delivered_at)
  if (!allDelivered) return 'sent'

  return others.every((id) => byUser.get(id)?.read_at) ? 'read' : 'delivered'
}

export function seenBy(message: MessageWithStatuses): ChatMessageStatus[] {
  return (message.statuses ?? []).filter((s) => s.read_at)
}

interface ThreadState {
  messages: MessageWithStatuses[]
  loading: boolean
  sending: boolean
}

export function useChatThread({
  roomId,
  meId,
  enabled,
}: {
  roomId: string | null
  meId: string
  enabled?: boolean
}) {
  const [state, setState] = useState<ThreadState>({
    messages: [],
    loading: false,
    sending: false,
  })
  const messagesRef = useRef<MessageWithStatuses[]>([])
  messagesRef.current = state.messages

  const mergeMessages = useCallback((incoming: MessageWithStatuses[]) => {
    setState((current) => {
      const byId = new Map(current.messages.map((m) => [m.id, m]))
      for (const message of incoming) {
        byId.set(message.id, message)
      }
      const merged = [...byId.values()].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      return { ...current, messages: merged }
    })
  }, [])

  const loadMessages = useCallback(async () => {
    if (!roomId || !enabled) return
    const supabase = createClient()
    setState((current) => ({ ...current, loading: true }))

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, statuses:chat_message_status(*)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (!error && data) {
      const rows = ((data as unknown as MessageWithStatuses[]) ?? []).map((m) => ({
        ...m,
        statuses: m.statuses ?? [],
      }))
      rows.reverse()
      mergeMessages(rows)

      const others = rows.filter((m) => m.sender_id !== meId)
      if (others.length > 0) {
        void markStatuses(others, meId, 'delivered_at', statusMapFrom(rows))
      }
    }

    setState((current) => ({ ...current, loading: false }))
  }, [roomId, enabled, meId, mergeMessages])

  const refreshStatuses = useCallback(async () => {
    if (!roomId || !enabled) return
    const currentIds = messagesRef.current.map((m) => m.id)
    if (currentIds.length === 0) return

    const supabase = createClient()
    const { data } = await supabase
      .from('chat_message_status')
      .select('*')
      .in('message_id', currentIds)

    if (!data) return
    const byMessage = new Map<string, ChatMessageStatus[]>()
    for (const status of data as ChatMessageStatus[]) {
      const list = byMessage.get(status.message_id) ?? []
      list.push(status)
      byMessage.set(status.message_id, list)
    }
    mergeMessages(
      messagesRef.current.map((m) => ({ ...m, statuses: byMessage.get(m.id) ?? [] })),
    )
  }, [roomId, enabled, mergeMessages])

  useEffect(() => {
    setState({ messages: [], loading: false, sending: false })
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!roomId || !enabled) return
    const supabase = createClient()

    const channel = supabase
      .channel(`chat-room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage
          const exists = messagesRef.current.some((m) => m.id === row.id)
          if (!exists) {
            mergeMessages([{ ...row, statuses: [] }])
            if (row.sender_id !== meId) {
              void markStatuses([{ ...row, statuses: [] }], meId, 'delivered_at', new Map())
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_message_status' },
        () => {
          void refreshStatuses()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, enabled, meId, mergeMessages, refreshStatuses])

  const send = useCallback(
    async (body: string) => {
      const trimmed = body.trim()
      if (!roomId || !trimmed) return

      const temp: MessageWithStatuses = {
        id: `temp-${Date.now()}`,
        room_id: roomId,
        sender_id: meId,
        body: trimmed,
        created_at: new Date().toISOString(),
        statuses: [],
      }
      mergeMessages([temp])
      setState((current) => ({ ...current, sending: true }))

      const supabase = createClient()
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ room_id: roomId, sender_id: meId, body: trimmed })
        .select('*, statuses:chat_message_status(*)')
        .single()

      if (!error && data) {
        setState((current) => ({
          ...current,
          sending: false,
          messages: current.messages.filter((m) => m.id !== temp.id),
        }))
        mergeMessages([
          { ...(data as unknown as MessageWithStatuses), statuses: (data as MessageWithStatuses).statuses ?? [] },
        ])
      } else {
        console.error('Error sending message:', error)
        setState((current) => ({
          ...current,
          sending: false,
          messages: current.messages.filter((m) => m.id !== temp.id),
        }))
      }
    },
    [roomId, meId, mergeMessages],
  )

  const markRead = useCallback(async () => {
    if (!enabled) return
    const pending = messagesRef.current.filter(
      (m) =>
        m.sender_id !== meId &&
        !(m.statuses ?? []).some((s) => s.user_id === meId && s.read_at),
    )
    if (pending.length === 0) return
    await markStatuses(pending, meId, 'read_at', statusMapFrom(pending))
  }, [meId, enabled])

  return { ...state, send, markRead }
}

function statusMapFrom(messages: MessageWithStatuses[]) {
  const map = new Map<string, ChatMessageStatus>()
  for (const message of messages) {
    for (const status of message.statuses ?? []) {
      map.set(`${status.message_id}:${status.user_id}`, status)
    }
  }
  return map
}

async function markStatuses(
  messages: MessageWithStatuses[],
  userId: string,
  field: 'delivered_at' | 'read_at',
  existing: Map<string, ChatMessageStatus>,
) {
  const now = new Date().toISOString()
  const rows = messages.map((m) => {
    const current =
      existing.get(`${m.id}:${userId}`) ??
      (m.statuses ?? []).find((s) => s.user_id === userId) ??
      null
    return {
      message_id: m.id,
      user_id: userId,
      delivered_at:
        field === 'delivered_at' ? (current?.delivered_at ?? now) : (current?.delivered_at ?? null),
      read_at: field === 'read_at' ? (current?.read_at ?? now) : (current?.read_at ?? null),
    }
  })

  const supabase = createClient()
  const { error } = await supabase
    .from('chat_message_status')
    .upsert(rows, { onConflict: 'message_id,user_id' })

  if (error) {
    console.error(`Error marking ${field}:`, error)
  }
}
