import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { BrasDroitGrid } from '@/components/dashboard/BrasDroitGrid'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import type { Profile } from '@/lib/supabase/database.types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as unknown as { data: Profile | null }

  if (profile?.role !== 'manager') redirect('/kanban')

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de l'équipe</p>
      </div>
      <KpiCards />
      <div>
        <h2 className="text-lg font-semibold mb-4">Bras droits</h2>
        <BrasDroitGrid />
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-4">Activité récente</h2>
        <ActivityTimeline />
      </div>
    </div>
  )
}
