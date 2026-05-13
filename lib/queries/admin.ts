'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/database.types'

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

export function useUpdateUserRole() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'manager' | 'bras_droit' }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any).update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}
