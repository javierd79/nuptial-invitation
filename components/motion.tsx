'use client'

import { AnimatePresence, motion, type Transition } from 'motion/react'
import type { ComponentProps, ReactNode } from 'react'

export const SPRING_SOFT: Transition = { type: 'spring', bounce: 0, duration: 0.35 }

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={SPRING_SOFT}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Tappable({ children, ...props }: ComponentProps<typeof motion.button>) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} transition={SPRING_SOFT} {...props}>
      {children}
    </motion.button>
  )
}
