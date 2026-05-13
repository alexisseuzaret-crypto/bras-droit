import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import type { CalendarBlock } from '@/lib/supabase/database.types'

export type CalendarBlockWithTask = CalendarBlock & {
  user_id: string
  is_private: boolean
  task: {
    id: string
    title: string
    status: string
    category: { color: string; name: string } | null
  }
}

export function useCalendarBlocks(userId?: string) {
  const supabase = createClient()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['calendar_blocks', userId],
    queryFn: async () => {
      let q = supabase
        .from('calendar_blocks')
        .select('*, is_private, user_id, task:tasks(id, title, status, category:categories(color, name))')
        .order('start_at')
      if (userId) q = q.eq('user_id', userId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as CalendarBlockWithTask[]
    },
    enabled: !!userId,
  })

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'bras_droit', table: 'calendar_blocks' }, () => {
        qc.invalidateQueries({ queryKey: ['calendar_blocks'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, qc, userId])

  return query
}

export function useCreateBlock() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (block: { task_id: string; user_id: string; start_at: string; end_at: string; notes?: string }) => {
      const { data, error } = await supabase.from('calendar_blocks').insert(block).select().single()
      if (error) throw error
      return data as CalendarBlock
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar_blocks'] }),
  })
}

export function useUpdateBlock() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<CalendarBlock> & { id: string }) => {
      const { error } = await supabase.from('calendar_blocks').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar_blocks'] }),
  })
}

export function useDeleteBlock() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_blocks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar_blocks'] }),
  })
}
