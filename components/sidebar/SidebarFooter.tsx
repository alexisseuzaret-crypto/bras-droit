'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/lib/supabase/database.types'

export function SidebarFooter({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Déconnecté')
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="p-3 border-t border-mia-800 flex items-center gap-2">
      <UserAvatar profile={profile} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{profile.full_name}</p>
        <p className="text-xs text-white/40 truncate">{profile.email}</p>
      </div>
      <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-mia-800 flex-shrink-0" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}
