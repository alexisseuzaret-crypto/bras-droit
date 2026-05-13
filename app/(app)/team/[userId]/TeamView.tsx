'use client'

import { UserAvatar } from '@/components/shared/UserAvatar'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import type { Profile } from '@/lib/supabase/database.types'

const ROLE_LABELS: Record<string, string> = {
  direction: 'Direction',
  conseiller_senior: 'Conseiller senior',
  responsable_bu: 'Responsable BU',
  sales: 'Sales',
  bras_droit: 'Bras droit',
}

export function TeamView({ targetProfile }: { targetProfile: Profile }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <UserAvatar profile={targetProfile} size="lg" />
          <div>
            <h1 className="text-xl font-bold">{targetProfile.full_name}</h1>
            <p className="text-sm text-muted-foreground">{ROLE_LABELS[targetProfile.role] ?? targetProfile.role}</p>
          </div>
        </div>
      </div>
      <KanbanBoard readOnly userId={targetProfile.id} />
    </div>
  )
}
