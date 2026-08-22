'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SEATING_KINDS, type SeatingItem, type SeatingKind } from '@/lib/seating'

export type SeatingSaveState = 'saved' | 'saving' | 'error'

const AUTOSAVE_DELAY = 800

export function useSeating(enabled: boolean) {
  const [items, setItems] = useState<SeatingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SeatingSaveState>('saved')

  const pendingRef = useRef<Map<string, Partial<SeatingItem>>>(new Map())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    const pending = pendingRef.current
    if (pending.size === 0) return

    const batch = [...pending.entries()]
    pending.clear()
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    setSaveState('saving')
    const supabase = createClient()
    let failed = false

    for (const [id, patch] of batch) {
      const { error } = await supabase.from('seating_items').update(patch).eq('id', id)
      if (error) {
        console.error('Error saving seating item:', error)
        failed = true
      }
    }

    setSaveState(failed ? 'error' : 'saved')
  }, [])

  const queueSave = useCallback(
    (id: string, patch: Partial<SeatingItem>) => {
      const current = pendingRef.current.get(id) ?? {}
      pendingRef.current.set(id, { ...current, ...patch })

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => void flush(), AUTOSAVE_DELAY)
    },
    [flush],
  )

  useEffect(() => {
    if (!enabled) return

    let mounted = true
    const supabase = createClient()

    const load = async () => {
      const { data, error } = await supabase
        .from('seating_items')
        .select('*')
        .order('created_at', { ascending: true })

      if (!mounted) return
      if (error) console.error('Error loading seating items:', error)
      setItems((data ?? []) as SeatingItem[])
      setLoading(false)
    }

    void load()

    const channel = supabase
      .channel('seating-items-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seating_items' },
        (change) => {
          if (!mounted) return

          const next = change.new as SeatingItem | undefined
          const deletedId = (change.old as { id?: string }).id

          if (!next?.id && deletedId) {
            setItems((prev) => prev.filter((item) => item.id !== deletedId))
            return
          }

          if (!next?.id || pendingRef.current.has(next.id)) return

          setItems((prev) =>
            prev.some((item) => item.id === next.id)
              ? prev.map((item) => (item.id === next.id ? next : item))
              : [...prev, next],
          )
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (mounted) setSaveState('error')
        }
      })

    return () => {
      mounted = false
      if (timerRef.current) clearTimeout(timerRef.current)
      void flush()
      supabase.removeChannel(channel)
    }
  }, [enabled, flush])

  const addItem = useCallback(async (kind: SeatingKind, position: { x: number; y: number }) => {
    const spec = SEATING_KINDS[kind]
    const supabase = createClient()
    const draft = {
      kind,
      x: position.x,
      y: position.y,
      w: spec.defaultSize.w,
      h: spec.defaultSize.h,
      rotation: 0,
      label: '',
      seats: spec.seats ? spec.seats.def : null,
      guest_ids: [] as string[],
    }

    const { data, error } = await supabase.from('seating_items').insert(draft).select('*').single()
    if (error || !data) {
      console.error('Error creating seating item:', error)
      setSaveState('error')
      return null
    }

    const created = data as SeatingItem
    setItems((prev) => [...prev, created])
    return created
  }, [])

  const updateItem = useCallback(
    (id: string, patch: Partial<SeatingItem>) => {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
      queueSave(id, patch)
    },
    [queueSave],
  )

  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    pendingRef.current.delete(id)

    const supabase = createClient()
    const { error } = await supabase.from('seating_items').delete().eq('id', id)
    if (error) {
      console.error('Error deleting seating item:', error)
      setSaveState('error')
    }
  }, [])

  return { items, loading, saveState, addItem, updateItem, deleteItem }
}
