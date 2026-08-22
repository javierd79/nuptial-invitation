'use client'

import Link from 'next/link'
import { MessagesSquare } from 'lucide-react'
import type { AuthUser } from '@/lib/auth'
import { useChatUnread } from '@/lib/use-chat-unread'
import ToastStack from '@/components/ToastStack'

export default function ChatButton({ user }: { user: AuthUser | null }) {
  const { total, toasts, dismissToast } = useChatUnread({ user })

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <Link
        href="/admin/chat"
        aria-label={`Chat del equipo${total > 0 ? ` (${total} sin leer)` : ''}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/30 text-ink transition-colors hover:bg-ink hover:text-ivory"
      >
        <MessagesSquare className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-700 px-1 font-serif text-[0.55rem] leading-none text-ivory">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </Link>
    </>
  )
}
