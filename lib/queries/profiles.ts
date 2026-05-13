import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/database.types'

export function useCurrentProfile() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['profile', 'current'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data as Profile
    },
  })
}

export function useAllProfiles() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useUpdateProfileRole() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'manager' | 'bras_droit' }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  })
}
