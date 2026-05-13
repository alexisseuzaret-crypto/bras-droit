import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { MobileSidebar } from '@/components/sidebar/MobileSidebar'
import { KeyboardShortcuts } from '@/components/shared/KeyboardShortcuts'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const heads = await headers()
  const pathname = heads.get('x-pathname') ?? ''
  const isChangePwd = pathname.startsWith('/change-password')

  if (profile.must_change_password && !isChangePwd) {
    redirect('/change-password')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {!isChangePwd && (
        <>
          <div className="hidden lg:flex">
            <Sidebar profile={profile} />
          </div>
          <MobileSidebar profile={profile} />
        </>
      )}
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
      {!isChangePwd && <KeyboardShortcuts />}
    </div>
  )
}
