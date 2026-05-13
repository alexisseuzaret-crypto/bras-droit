import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from './ChangePasswordForm'

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', user.id)
    .single()

  if (!profile?.must_change_password) redirect('/kanban')

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <ChangePasswordForm userId={user.id} />
    </div>
  )
}
