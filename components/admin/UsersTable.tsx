'use client'

import { UserAvatar } from '@/components/shared/UserAvatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAllUsers, useUpdateUserProfile } from '@/lib/queries/admin'
import { useCurrentProfile } from '@/lib/queries/profiles'
import type { Role } from '@/lib/supabase/database.types'
import { toast } from 'sonner'

const ROLE_LABELS: Record<Role, string> = {
  direction: 'Direction',
  conseiller_senior: 'Conseiller senior',
  responsable_bu: 'Responsable BU',
  sales: 'Sales',
  bras_droit: 'Bras droit',
}

export function UsersTable() {
  const { data: users = [], isLoading } = useAllUsers()
  const { data: me } = useCurrentProfile()
  const updateProfile = useUpdateUserProfile()

  const handleRoleChange = async (userId: string, role: Role) => {
    try {
      await updateProfile.mutateAsync({ id: userId, role })
      toast.success('Rôle mis à jour')
    } catch {
      toast.error('Erreur')
    }
  }

  const handleManagerChange = async (userId: string, managerId: string | null) => {
    try {
      await updateProfile.mutateAsync({ id: userId, manager_id: managerId })
      toast.success('Manager mis à jour')
    } catch {
      toast.error('Erreur')
    }
  }

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>

  return (
    <div className="space-y-2">
      {users.map(user => {
        const managerOptions = users.filter(u => u.role !== 'bras_droit' && u.id !== user.id)
        return (
          <div key={user.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card flex-wrap">
            <UserAvatar profile={user} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Select
              value={user.role}
              onValueChange={v => v && handleRoleChange(user.id, v as Role)}
              disabled={user.id === me?.id}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={user.manager_id ?? ''}
              onValueChange={v => handleManagerChange(user.id, v || null)}
              disabled={user.id === me?.id}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Aucun manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun</SelectItem>
                {managerOptions.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      })}
    </div>
  )
}
