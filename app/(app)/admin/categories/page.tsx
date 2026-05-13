import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CategoriesClient } from './CategoriesClient'
import type { Profile } from '@/lib/supabase/database.types'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as unknown as { data: Profile | null }

  if (profile?.role !== 'manager') redirect('/kanban')

  return <CategoriesClient />
}
