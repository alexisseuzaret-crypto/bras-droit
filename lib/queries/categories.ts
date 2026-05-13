import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/lib/supabase/database.types'

export function useCategories() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_archived', false)
        .order('position')
      if (error) throw error
      return data as Category[]
    },
  })
}

export function useCategoriesWithCount() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['categories', 'with-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*, tasks(count)')
        .eq('is_archived', false)
        .order('position')
      if (error) throw error
      return data as unknown as (Category & { tasks: [{ count: number }] })[]
    },
  })
}

export function useCreateCategory() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cat: { name: string; color: string }) => {
      const { data: existing } = await supabase.from('categories').select('position').order('position', { ascending: false }).limit(1).single()
      const position = (existing?.position ?? 0) + 1
      const { error } = await supabase.from('categories').insert({ ...cat, position })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<Category> & { id: string }) => {
      const { error } = await supabase.from('categories').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
