'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { ArrowLeft, Check, CheckCheck, LayoutDashboard, LogOut, Send, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getUserWithRole, roleHome, type AuthUser } from '@/lib/auth'
import { Collapse, SPRING_SOFT, Tappable } from '@/components/motion'
import {
  GROUP_ROOM_ID,
  displayName,
  dmParticipantIds,
  dmRoomId,
  groupByDay,
  initials,
  timeLabel,
  type ChatMessage,
  type ChatProfile,
  type MessageWithStatuses,
} from '@/lib/chat'
import { seenBy, tickFor, useChatThread } from '@/lib/use-chat-thread'
import { useChatUnread } from '@/lib/use-chat-unread'

const EASE_IOS: [number, number, number, number] = [0.32, 0.72, 0, 1]

const viewVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? '100%' : '-24%',
    opacity: direction >= 0 ? 1 : 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? '-24%' : '100%',
    opacity: direction >= 0 ? 0 : 1,
  }),
}

function previewTime(iso: string): string {
  const date = new Date(iso)
  const key = date.toDateString()
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86_400_000).toDateString()
  if (key === today) return timeLabel(iso)
  if (key === yesterday) return 'Ayer'
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<ChatProfile[]>([])
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, ChatMessage>>({})
  const [draft, setDraft] = useState('')
  const [seenFor, setSeenFor] = useState<string | null>(null)
  const [navDirection, setNavDirection] = useState(1)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { byRoom, refresh } = useChatUnread({ user })
  const thread = useChatThread({
    roomId: activeRoom,
    meId: user?.id ?? '',
    enabled: Boolean(user),
  })

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/admin/login')
        return
      }

      const authUser = await getUserWithRole(supabase)
      if (!authUser) {
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }
      if (!mounted) return
      setUser(authUser)

      await supabase.from('chat_profiles').upsert(
        {
          user_id: authUser.id,
          email: authUser.email ?? '',
          full_name: '',
          role: authUser.role,
        },
        { onConflict: 'user_id' },
      )

      const { data } = await supabase
        .from('chat_profiles')
        .select('*')
        .order('full_name', { ascending: true })

      if (!mounted) return
      setProfiles((data ?? []) as ChatProfile[])
      setLoading(false)
    }

    void init()
    return () => {
      mounted = false
    }
  }, [router])

  const peers = useMemo(() => profiles.filter((p) => p.user_id !== user?.id), [profiles, user])
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.user_id, p])), [profiles])

  const rooms = useMemo(() => {
    if (!user) return []
    return [GROUP_ROOM_ID, ...peers.map((p) => dmRoomId(user.id, p.user_id))]
  }, [peers, user])

  const loadPreviews = useCallback(async () => {
    if (!user || rooms.length === 0) return
    const supabase = createClient()

    const { data } = await supabase
      .from('chat_messages')
      .select('id, room_id, sender_id, body, created_at')
      .in('room_id', rooms)
      .order('created_at', { ascending: false })
      .limit(200)

    const next: Record<string, ChatMessage> = {}
    for (const message of (data ?? []) as ChatMessage[]) {
      if (!next[message.room_id]) next[message.room_id] = message
    }
    setPreviews(next)
  }, [user, rooms])

  useEffect(() => {
    if (!user) return

    void loadPreviews()

    const onFocus = () => {
      void loadPreviews()
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    const timer = setInterval(onFocus, 45_000)

    const supabase = createClient()
    const channel = supabase
      .channel('chat-previews')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          void loadPreviews()
        },
      )
      .subscribe()

    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [user, loadPreviews, refresh])

  useEffect(() => {
    if (!activeRoom) {
      void loadPreviews()
      void refresh()
    }
  }, [activeRoom, loadPreviews, refresh])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [thread.messages.length, activeRoom])

  useEffect(() => {
    if (!activeRoom || !user) return

    const markIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void thread.markRead().then(() => setTimeout(() => void refresh(), 900))
      }
    }
    markIfVisible()

    document.addEventListener('visibilitychange', markIfVisible)
    window.addEventListener('focus', markIfVisible)
    return () => {
      document.removeEventListener('visibilitychange', markIfVisible)
      window.removeEventListener('focus', markIfVisible)
    }
  }, [activeRoom, user, thread, refresh])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || thread.sending) return
    setDraft('')
    await thread.send(body)
    setTimeout(() => void refresh(), 900)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const activePeerId = activeRoom
    ? dmParticipantIds(activeRoom).find((id) => id !== user?.id) ?? null
    : null

  const roomName = activeRoom
    ? activeRoom === GROUP_ROOM_ID
      ? 'Equipo'
      : displayName(profileById.get(activePeerId ?? ''))
    : ''

  const participants = useMemo(() => {
    if (!user) return []
    if (!activeRoom || activeRoom === GROUP_ROOM_ID) {
      return [user.id, ...peers.map((p) => p.user_id)]
    }
    return [user.id, ...(activePeerId ? [activePeerId] : [])]
  }, [activePeerId, activeRoom, peers, user])

  const nameOf = useCallback(
    (senderId: string) => {
      if (senderId === user?.id) return 'Tú'
      return displayName(profileById.get(senderId))
    },
    [profileById, user],
  )

  const senderFlags = useMemo(() => {
    const flags = new Map<string, boolean>()
    thread.messages.forEach((message, index) => {
      const previous = index > 0 ? thread.messages[index - 1] : null
      flags.set(
        message.id,
        message.sender_id !== user?.id && (!previous || previous.sender_id !== message.sender_id),
      )
    })
    return flags
  }, [thread.messages, user])

  const openRoom = (roomId: string) => {
    setNavDirection(1)
    setActiveRoom(roomId)
    setSeenFor(null)
  }

  const closeRoom = () => {
    setNavDirection(-1)
    setActiveRoom(null)
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory text-ink">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-px animate-pulse bg-ink/20" />
          <p className="font-serif text-sm italic text-ink-soft">Abriendo chat…</p>
        </div>
      </div>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-[100dvh] flex-col bg-ivory text-ink">
      <header className="border-b border-ink/10 bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3">
          {activeRoom ? (
            <>
              <button
                type="button"
                onClick={closeRoom}
                aria-label="Volver a conversaciones"
                className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-lg font-light leading-tight">{roomName}</p>
                <p className="font-serif text-[0.6rem] uppercase tracking-[0.25em] text-ink-faint">
                  {activeRoom === GROUP_ROOM_ID ? `${participants.length} miembros` : 'Mensaje directo'}
                </p>
              </div>
            </>
          ) : (
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl font-light tracking-[-0.01em]">Chat</h1>
              <p className="truncate font-serif text-[0.6rem] uppercase tracking-[0.3em] text-ink-faint">
                Javier &amp; Maria · Equipo
              </p>
            </div>
          )}
          {user.role && (
            <span className="shrink-0 border border-brass/30 bg-brass/10 px-2 py-1 font-serif text-[0.55rem] uppercase tracking-[0.25em] text-brass">
              {user.role}
            </span>
          )}
          {!activeRoom && (
            <>
              <button
                type="button"
                onClick={() => router.push(roleHome(user.role))}
                aria-label="Volver al panel"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-ivory"
              >
                <LayoutDashboard className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-ivory"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={navDirection}>
          {!activeRoom ? (
            <motion.main
              key="room-list"
              custom={navDirection}
              variants={viewVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: EASE_IOS }}
              className="absolute inset-0 overflow-y-auto pb-6"
            >
          <ul>
            <li>
              <button
                type="button"
                onClick={() => openRoom(GROUP_ROOM_ID)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ivory-deep/50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brass/30 bg-brass/10 text-brass">
                  <Users className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-serif text-base">Equipo</span>
                    {previews[GROUP_ROOM_ID] && (
                      <span className="shrink-0 font-serif text-[0.6rem] text-ink-faint">
                        {previewTime(previews[GROUP_ROOM_ID].created_at)}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-serif text-xs font-light text-ink-soft">
                      {previews[GROUP_ROOM_ID]
                        ? `${nameOf(previews[GROUP_ROOM_ID].sender_id)}: ${previews[GROUP_ROOM_ID].body}`
                        : 'Canal para todo el equipo'}
                    </span>
                    {(byRoom[GROUP_ROOM_ID] ?? 0) > 0 && (
                      <motion.span
                        key={byRoom[GROUP_ROOM_ID]}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={SPRING_SOFT}
                        className="shrink-0 rounded-full bg-red-700 px-1.5 py-0.5 font-serif text-[0.55rem] leading-none text-ivory"
                      >
                        {byRoom[GROUP_ROOM_ID]}
                      </motion.span>
                    )}
                  </span>
                </span>
              </button>
            </li>

            {peers.map((peer) => {
              const roomId = dmRoomId(user.id, peer.user_id)
              const last = previews[roomId]
              return (
                <li key={peer.user_id}>
                  <button
                    type="button"
                    onClick={() => openRoom(roomId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ivory-deep/50"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-ivory-deep font-serif text-sm text-ink-soft">
                      {initials(displayName(peer))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-serif text-base">{displayName(peer)}</span>
                        {last && (
                          <span className="shrink-0 font-serif text-[0.6rem] text-ink-faint">
                            {previewTime(last.created_at)}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-serif text-xs font-light text-ink-soft">
                          {last?.body ?? 'Sin mensajes aún'}
                        </span>
                        {(byRoom[roomId] ?? 0) > 0 && (
                          <motion.span
                            key={byRoom[roomId]}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={SPRING_SOFT}
                            className="shrink-0 rounded-full bg-red-700 px-1.5 py-0.5 font-serif text-[0.55rem] leading-none text-ivory"
                          >
                            {byRoom[roomId]}
                          </motion.span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {peers.length === 0 && (
            <p className="mt-16 px-8 text-center font-serif text-sm italic text-ink-soft">
              Aún no hay más miembros del equipo. Cuando otro usuario entre al chat aparecerá aquí.
            </p>
          )}
            </motion.main>
          ) : (
            <motion.div
              key={activeRoom}
              custom={navDirection}
              variants={viewVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: EASE_IOS }}
              className="absolute inset-0 flex flex-col"
            >
          <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {thread.loading && thread.messages.length === 0 ? (
              <p className="py-12 text-center font-serif text-sm italic text-ink-soft">
                Cargando mensajes…
              </p>
            ) : thread.messages.length === 0 ? (
              <p className="py-12 text-center font-serif text-sm italic text-ink-soft">
                Sin mensajes todavía. ¡Escribe el primero!
              </p>
            ) : (
              groupByDay(thread.messages).map((group) => (
                <Fragment key={group.key}>
                  <div className="my-4 flex justify-center">
                    <span className="rounded-full border border-ink/10 bg-ivory-deep px-3 py-1 font-serif text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint">
                      {group.label}
                    </span>
                  </div>
                  {group.items.map((message) => (
                    <MessageRow
                      key={message.id}
                      message={message}
                      mine={message.sender_id === user.id}
                      showSender={senderFlags.get(message.id) ?? false}
                      senderLabel={nameOf(message.sender_id)}
                      participants={participants}
                      meId={user.id}
                      profileById={profileById}
                      expanded={seenFor === message.id}
                      onToggleSeen={() =>
                        setSeenFor((current) => (current === message.id ? null : message.id))
                      }
                    />
                  ))}
                </Fragment>
              ))
            )}
            <div ref={bottomRef} />
          </main>

          <form onSubmit={handleSend} className="border-t border-ink/10 bg-ivory p-3">
            <div className="mx-auto flex w-full max-w-md items-end gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={activeRoom === GROUP_ROOM_ID ? 'Mensaje al equipo…' : `Mensaje para ${roomName}…`}
                className="min-w-0 flex-1 rounded-full border border-ink/20 bg-transparent px-4 py-2.5 font-serif text-base font-light placeholder:text-ink/25 focus:border-brass focus:outline-none"
                autoComplete="off"
              />
              <Tappable
                type="submit"
                disabled={!draft.trim() || thread.sending}
                aria-label="Enviar mensaje"
                whileTap={{ scale: 0.88 }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brass bg-brass text-ivory disabled:pointer-events-none disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </Tappable>
            </div>
          </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </MotionConfig>
  )
}

function MessageRow({
  message,
  mine,
  showSender,
  senderLabel,
  participants,
  meId,
  profileById,
  expanded,
  onToggleSeen,
}: {
  message: MessageWithStatuses
  mine: boolean
  showSender: boolean
  senderLabel: string
  participants: string[]
  meId: string
  profileById: Map<string, ChatProfile>
  expanded: boolean
  onToggleSeen: () => void
}) {
  const readers = seenBy(message).filter((s) => s.user_id !== meId)
  const tick = mine ? tickFor(message, meId, participants) : 'sent'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING_SOFT}
      className={`mb-2 flex flex-col ${mine ? 'items-end' : 'items-start'}`}
    >
      {showSender && (
        <p className="mb-0.5 ml-1 font-serif text-[0.65rem] uppercase tracking-[0.15em] text-ink-faint">
          {senderLabel}
        </p>
      )}
      <div
        className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 font-serif text-[0.95rem] font-light ${
          mine
            ? 'rounded-br-md bg-brass text-ivory'
            : 'rounded-bl-md border border-ink/10 bg-ivory-deep text-ink'
        }`}
      >
        {message.body}
      </div>
      <div
        className={`mt-0.5 flex items-center gap-1 px-1 ${mine ? 'flex-row' : ''} ${
          mine ? 'justify-end' : 'justify-start'
        }`}
      >
        <span className="font-serif text-[0.6rem] text-ink-faint">{timeLabel(message.created_at)}</span>
        {mine && tick !== 'sent' && (
          <CheckCheck
            className={`h-3 w-3 ${tick === 'read' ? 'text-brass' : 'text-ink/35'}`}
            aria-label={tick === 'read' ? 'Leído por todos' : 'Entregado'}
          />
        )}
        {mine && tick === 'sent' && (
          <Check className="h-3 w-3 text-ink/35" aria-label="Enviado" />
        )}
      </div>

      {mine && readers.length > 0 && (
        <div className="px-1 pt-0.5 text-right">
          <button
            type="button"
            onClick={onToggleSeen}
            className="font-serif text-[0.6rem] uppercase tracking-[0.15em] text-ink-faint underline underline-offset-4 transition-colors hover:text-ink"
          >
            Visto por {readers.length}
          </button>
          <Collapse open={expanded}>
            <p className="pt-1 font-serif text-[0.7rem] font-light text-ink-soft">
              {readers
                .map((r) => `${displayName(profileById.get(r.user_id))} · ${timeLabel(r.read_at!)}`)
                .join(', ')}
            </p>
          </Collapse>
        </div>
      )}
    </motion.div>
  )
}
