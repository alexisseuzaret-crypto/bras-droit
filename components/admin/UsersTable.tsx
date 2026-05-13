'use client'

import { UserAvatar } from '@/components/shared/UserAvatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAllUsers, useUpdateUserRole } from '@/lib/queries/admin'
import { useCurrentProfile } from '@/lib/queries/profiles'
import { toast } from 'sonner'

export function UsersTable() {
  const { data: users = [], isLoading } = useAllUsers()
  const { data: me } = useCurrentProfile()
  const updateRole = useUpdateUserRole()

  const handleRoleChange = async (userId: string, role: 'manager' | 'bras_droit') => {
    try {
      await updateRole.mutateAsync({ id: userId, role })
      toast.success('Rôle mis à jour')
    } catch {
      toast.error('Erreur')
    }
  }

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>

  return (
    <div className="space-y-2">
      {users.map(user => (
        <div key={user.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
          <UserAvatar profile={user} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{user.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Select
            value={user.role}
            onValueChange={(v) => v && handleRoleChange(user.id, v as 'manager' | 'bras_droit')}
            disabled={user.id === me?.id}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="bras_droit">Bras droit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}
