'use client'

import { useActivityFeed, type ActivityFeedItem } from '@/lib/queries/dashboard'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const ACTION_LABELS: Record<string, string> = { status_changed: 'a changé le statut' }
const STATUS_LABELS_FR: Record<string, string> = { todo: 'À faire', in_progress: 'En cours', done: 'Terminée' }

export function ActivityTimeline() {
  const { data: events = [], isLoading } = useActivityFeed()

  if (isLoading) return <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
  if (events.length === 0) return <p className="text-sm text-muted-foreground">Aucune activité récente.</p>

  return (
    <div className="space-y-3">
      {events.map((event: ActivityFeedItem) => (
        <div key={event.id} className="flex items-start gap-3 text-sm">
          {event.user && <UserAvatar profile={event.user} />}
          <div className="flex-1 min-w-0">
            <p className="leading-snug">
              <span className="font-medium">{event.user?.full_name ?? 'Système'}</span>
              {' '}{ACTION_LABELS[event.action] ?? event.action}
              {event.action === 'status_changed' && event.details && (
                <span className="text-muted-foreground"> {STATUS_LABELS_FR[event.details.from ?? ''] ?? event.details.from} → {STATUS_LABELS_FR[event.details.to ?? ''] ?? event.details.to}</span>
              )}
              {' '}sur <span className="font-medium">{event.task?.title ?? '—'}</span>
            </p>
            <p className="text-xs text-muted-foreground">{format(new Date(event.created_at), 'd MMM HH:mm', { locale: fr })}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
