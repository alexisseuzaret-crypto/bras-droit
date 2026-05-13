import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UsersTable } from '@/components/admin/UsersTable'
import type { Profile } from '@/lib/supabase/database.types'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as unknown as { data: Profile | null }

  if (profile?.role !== 'direction') redirect('/kanban')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérer les rôles de l'équipe</p>
      </div>
      <UsersTable />
    </div>
  )
}
