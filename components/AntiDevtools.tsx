'use client'

import { useEffect } from 'react'

export default function AntiDevtools() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return

    const reload = () => location.reload()
    const SIZE_THRESHOLD = 160
    const DEBUGGER_THRESHOLD = 150

    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (isTyping) return

      const isDevShortcut =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === 'U')

      if (isDevShortcut) {
        e.preventDefault()
        reload()
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    const detectSize = () => {
      if (window.innerWidth < 768) return
      const widthDiff = window.outerWidth - window.innerWidth
      const heightDiff = window.outerHeight - window.innerHeight
      if (widthDiff > SIZE_THRESHOLD || heightDiff > SIZE_THRESHOLD) reload()
    }

    const detectDebugger = () => {
      const start = performance.now()
      debugger
      const elapsed = performance.now() - start
      if (elapsed > DEBUGGER_THRESHOLD) reload()
    }

    window.addEventListener('keydown', handleKey)
    window.addEventListener('contextmenu', handleContextMenu)
    const intervalId = window.setInterval(() => {
      detectSize()
      detectDebugger()
    }, 1000)

    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('contextmenu', handleContextMenu)
      window.clearInterval(intervalId)
    }
  }, [])

  return null
}
