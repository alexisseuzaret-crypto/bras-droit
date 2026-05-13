'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { PriorityBadge } from '@/components/task/PriorityBadge'
import { CategoryBadge } from '@/components/task/CategoryBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatDate, isDueDateOverdue, cn } from '@/lib/utils'
import { CalendarDays, CheckSquare, Clock, Eye, EyeOff } from 'lucide-react'
import { useUpdateTask } from '@/lib/queries/tasks'
import type { TaskWithRelations } from '@/lib/supabase/database.types'

interface TaskCardProps {
  task: TaskWithRelations
  onClick: (task: TaskWithRelations) => void
  currentUserId?: string
}

export function TaskCard({ task, onClick, currentUserId }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  })
  const updateTask = useUpdateTask()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const doneSteps = task.steps.filter(s => s.is_done).length
  const totalSteps = task.steps.length
  const isOverdue = isDueDateOverdue(task.due_date)
  const isOwner = currentUserId && task.creator_id === currentUserId

  function handleTogglePrivate(e: React.MouseEvent) {
    e.stopPropagation()
    updateTask.mutate({ id: task.id, is_private: !task.is_private })
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="mb-2 cursor-pointer hover:shadow-md transition-shadow border" onClick={() => onClick(task)}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{task.title}</p>
            {isOwner && (
              <button
                type="button"
                onClick={handleTogglePrivate}
                className="flex-shrink-0 ml-1 mt-0.5 p-0.5 rounded hover:bg-muted transition-colors"
                title={task.is_private ? 'Tâche privée — cliquer pour rendre publique' : 'Tâche publique — cliquer pour rendre privée'}
              >
                {task.is_private
                  ? <EyeOff className="h-3.5 w-3.5 text-red-500" />
                  : <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </button>
            )}
          </div>
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
