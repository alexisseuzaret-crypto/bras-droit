'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Role } from '@/lib/supabase/database.types'

export function useAllUsers() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useUpdateUserProfile() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role, manager_id }: { id: string; role?: Role; manager_id?: string | null }) => {
      const update: { role?: Role; manager_id?: string | null } = {}
      if (role !== undefined) update.role = role
      if (manager_id !== undefined) update.manager_id = manager_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any).update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}
