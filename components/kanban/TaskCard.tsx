'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { PriorityBadge } from '@/components/task/PriorityBadge'
import { CategoryBadge } from '@/components/task/CategoryBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatDate, isDueDateOverdue, cn } from '@/lib/utils'
import { CalendarDays, CheckSquare, Clock } from 'lucide-react'
import type { TaskWithRelations } from '@/lib/supabase/database.types'

interface TaskCardProps {
  task: TaskWithRelations
  onClick: (task: TaskWithRelations) => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const doneSteps = task.steps.filter(s => s.is_done).length
  const totalSteps = task.steps.length
  const isOverdue = isDueDateOverdue(task.due_date)

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="mb-2 cursor-pointer hover:shadow-md transition-shadow border" onClick={() => onClick(task)}>
        <CardContent className="p-3 space-y-2">
          <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
          <div className="flex flex-wrap gap-1">
            <PriorityBadge priority={task.priority} />
            <CategoryBadge category={task.category} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {task.due_date && (
                <span className={cn('flex items-center gap-1', isOverdue && 'text-red-500 font-medium')}>
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(task.due_date)}
                </span>
              )}
              {totalSteps > 0 && (
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {doneSteps}/{totalSteps}
                </span>
              )}
              {task.estimated_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.round(task.estimated_minutes / 60)}h
                </span>
              )}
            </div>
            {task.assignee && <UserAvatar profile={task.assignee} showTooltip />}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
