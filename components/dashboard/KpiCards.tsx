'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useKpiStats } from '@/lib/queries/dashboard'
import { ListTodo, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

export function KpiCards() {
  const { data: stats, isLoading } = useKpiStats()

  const cards = [
    { label: 'Total tâches', value: stats?.total, icon: ListTodo, color: 'text-mia-900' },
    { label: 'En cours', value: stats?.inProgress, icon: Loader2, color: 'text-amber-500' },
    { label: 'Terminées cette semaine', value: stats?.doneThisWeek, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'En retard', value: stats?.overdue, icon: AlertTriangle, color: 'text-red-500' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              {card.label}
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{isLoading ? '—' : card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
