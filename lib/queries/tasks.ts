import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import type { Task, TaskStep, TaskWithRelations } from '@/lib/supabase/database.types'

export interface TaskFilters {
  status?: string
  priority?: string
  category?: string
  assignee?: string
  userId?: string
}

export function useTasks(filters: TaskFilters = {}) {
  const supabase = createClient()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let q = supabase
        .from('tasks')
        .select('*, category:categories(*), assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_creator_id_fkey(*), steps:task_steps(*)')
        .order('position')

      if (filters.status) q = q.eq('status', filters.status as 'todo' | 'in_progress' | 'done')
      if (filters.priority) q = q.eq('priority', parseInt(filters.priority))
      if (filters.category) q = q.eq('category_id', filters.category)
      if (filters.assignee === 'me' && filters.userId) {
        q = q.eq('assignee_id', filters.userId)
      } else if (filters.assignee && filters.assignee !== 'me') {
        q = q.eq('assignee_id', filters.assignee)
      }

      const { data, error } = await q
      if (error) throw error
      return data as unknown as TaskWithRelations[]
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'bras_droit', table: 'tasks' }, () => {
        qc.invalidateQueries({ queryKey: ['tasks'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, qc])

  return query
}

export function useCreateTask() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (task: {
      title: string
      description?: string
      status?: 'todo' | 'in_progress' | 'done'
      priority?: number
      category_id?: string | null
      assignee_id?: string | null
      creator_id: string
      due_date?: string | null
      estimated_minutes?: number | null
      position?: number
    }) => {
      const { data, error } = await supabase.from('tasks').insert(task).select().single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<Task> & { id: string }) => {
      const { error } = await supabase.from('tasks').update(update).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...update }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const previous = qc.getQueriesData<TaskWithRelations[]>({ queryKey: ['tasks'] })
      qc.setQueriesData<TaskWithRelations[]>({ queryKey: ['tasks'] }, old =>
        old?.map(t => t.id === id ? { ...t, ...update } : t) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useReorderTasks() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; position: number; status?: 'todo' | 'in_progress' | 'done' }[]) => {
      await Promise.all(
        updates.map(({ id, position, status }) =>
          supabase.from('tasks').update({ position, ...(status ? { status } : {}) }).eq('id', id)
        )
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCreateStep() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (step: { task_id: string; title: string; position: number }) => {
      const { data, error } = await supabase.from('task_steps').insert(step).select().single()
      if (error) throw error
      return data as TaskStep
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateStep() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<TaskStep> & { id: string }) => {
      const { error } = await supabase.from('task_steps').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteStep() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_steps').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
