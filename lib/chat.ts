export interface ChatProfile {
  user_id: string
  email: string
  full_name: string
  role: string
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  body: string
  created_at: string
}

export interface ChatMessageStatus {
  message_id: string
  user_id: string
  delivered_at: string | null
  read_at: string | null
}

export type MessageWithStatuses = ChatMessage & { statuses: ChatMessageStatus[] }

export const GROUP_ROOM_ID = 'group'

export function dmRoomId(a: string, b: string): string {
  return `dm:${[a, b].sort().join('|')}`
}

export function dmParticipantIds(roomId: string): string[] {
  if (!roomId.startsWith('dm:')) return []
  return roomId.slice(3).split('|').filter(Boolean)
}

export function displayName(profile?: Pick<ChatProfile, 'full_name' | 'email'> | null): string {
  if (!profile) return 'Usuario'
  const name = profile.full_name?.trim()
  return name || profile.email.split('@')[0]
}

export function initials(nameOrEmail: string): string {
  const source = nameOrEmail.trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

const timeFormatter = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' })

export function timeLabel(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

export interface DayGroup<T extends { created_at: string } = ChatMessage> {
  key: string
  label: string
  items: T[]
}

export function groupByDay<T extends { created_at: string }>(messages: T[]): DayGroup<T>[] {
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86_400_000).toDateString()
  const currentYear = new Date().getFullYear()

  const groups: DayGroup<T>[] = []
  let current: DayGroup<T> | null = null

  for (const message of messages) {
    const date = new Date(message.created_at)
    const key = date.toDateString()
    let label: string
    if (key === today) {
      label = 'Hoy'
    } else if (key === yesterday) {
      label = 'Ayer'
    } else {
      label = date.toLocaleDateString('es', { day: 'numeric', month: 'long' })
      if (date.getFullYear() !== currentYear) {
        label += ` de ${date.getFullYear()}`
      }
    }

    if (!current || current.key !== key) {
      current = { key, label, items: [message] }
      groups.push(current)
    } else {
      current.items.push(message)
    }
  }

  return groups
}
