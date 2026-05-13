'use client'

import { Card, CardContent } from '@/components/ui/card'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useBrasDroitStats } from '@/lib/queries/dashboard'
import { formatDate } from '@/lib/utils'

export function BrasDroitGrid() {
  const { data: stats = [], isLoading } = useBrasDroitStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
      </div>
    )
  }

  if (stats.length === 0) return <p className="text-sm text-muted-foreground">Aucun bras droit pour l&apos;instant.</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map(({ profile, inProgress, doneThisWeek, completionPct, lastActivity }) => (
        <Card key={profile.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar profile={profile} size="md" />
              <div>
                <p className="font-semibold text-sm">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-muted-foreground text-xs">En cours</p><p className="font-semibold text-amber-500">{inProgress}</p></div>
              <div><p className="text-muted-foreground text-xs">% semaine</p><p className="font-semibold text-emerald-500">{completionPct}%</p></div>
            </div>
            {lastActivity && <p className="text-xs text-muted-foreground">Dernière activité : {formatDate(lastActivity)}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
