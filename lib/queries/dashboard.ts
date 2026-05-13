import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { startOfWeek, endOfWeek } from 'date-fns'
import type { Profile } from '@/lib/supabase/database.types'

export function useKpiStats() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['dashboard', 'kpi'],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
      const today = new Date().toISOString().split('T')[0]

      const [a, b, c, d] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done').gte('completed_at', weekStart).lte('completed_at', weekEnd),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done').lt('due_date', today),
      ])
      return { total: a.count ?? 0, inProgress: b.count ?? 0, doneThisWeek: c.count ?? 0, overdue: d.count ?? 0 }
    },
  })
}

export function useBrasDroitStats() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['dashboard', 'bras-droit'],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*, tasks:tasks(id, status, completed_at, updated_at)')
        .eq('role', 'bras_droit')
      if (error) throw error

      type ProfileWithTasks = Profile & { tasks: { id: string; status: string; completed_at: string | null; updated_at: string }[] }
      return (profiles as unknown as ProfileWithTasks[])?.map(p => {
        const tasks = p.tasks ?? []
        const inProgress = tasks.filter(t => t.status === 'in_progress').length
        const doneThisWeek = tasks.filter(t => t.status === 'done' && t.completed_at && t.completed_at >= weekStart && t.completed_at <= weekEnd).length
        const total = tasks.filter(t => t.status !== 'done').length
        const pct = Math.round((doneThisWeek / Math.max(total + doneThisWeek, 1)) * 100)
        const lastActivity = tasks.reduce((acc, t) => (t.updated_at > acc ? t.updated_at : acc), '')
        const { tasks: _tasks, ...profileData } = p
        return { profile: profileData as Profile, inProgress, doneThisWeek, completionPct: pct, lastActivity }
      }) ?? []
    },
  })
}

export type ActivityFeedItem = {
  id: string
  action: string
  created_at: string
  details: { from?: string; to?: string } | null
  user: { full_name: string; avatar_color: string } | null
  task: { title: string } | null
}

export function useActivityFeed() {
  const supabase = createClient()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*, user:profiles(full_name, avatar_color), task:tasks(title)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as unknown as ActivityFeedItem[]
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('activity-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'bras_droit', table: 'activity_log' }, () => {
        qc.invalidateQueries({ queryKey: ['dashboard'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, qc])

  return query
}
