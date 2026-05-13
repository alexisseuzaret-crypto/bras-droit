import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamView } from './TeamView'
import type { Profile } from '@/lib/supabase/database.types'

export default async function TeamMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: targetProfile } = await supabase.from('profiles').select('*').eq('id', userId).single() as unknown as { data: Profile | null }
  if (!targetProfile) notFound()
  return <TeamView targetProfile={targetProfile} />
}
