'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import type { GuestChangeToast } from '@/lib/use-guest-change-notifications'

const KIND_DOT: Record<GuestChangeToast['kind'], string> = {
  rsvp: 'bg-brass',
  arrival: 'bg-brass',
  'checkin-detail': 'bg-ink-soft',
  participation: 'bg-ink-soft',
  note: 'bg-ink-soft',
  chat: 'bg-brass',
}

export default function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: GuestChangeToast[]
  onDismiss: (id: string) => void
}) {
  const reducedMotion = useReducedMotion()

  const enterState = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.97 }
  const visibleState = { opacity: 1, y: 0, scale: 1 }
  const exitState = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.97 }

  const transition = reducedMotion
    ? { duration: 0.2, ease: 'easeOut' as const }
    : { type: 'spring' as const, bounce: 0, duration: 0.3 }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-20 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={enterState}
            animate={visibleState}
            exit={exitState}
            transition={transition}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-ink/10 bg-ivory-deep px-4 py-3 shadow-lg shadow-ink/10"
          >
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${KIND_DOT[toast.kind]}`} />
            <p className="min-w-0 flex-1 font-serif text-sm font-light text-ink">{toast.text}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Descartar aviso"
              className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
