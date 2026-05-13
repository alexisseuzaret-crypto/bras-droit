'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/constants'
import type { TaskWithRelations } from '@/lib/supabase/database.types'

interface KanbanColumnProps {
  status: 'todo' | 'in_progress' | 'done'
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onAddTask: (status: 'todo' | 'in_progress' | 'done') => void
  readOnly?: boolean
  currentUserId?: string
}

export function KanbanColumn({ status, tasks, onTaskClick, onAddTask, readOnly, currentUserId }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
          <h3 className="font-semibold text-sm">{STATUS_LABELS[status]}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        {!readOnly && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddTask(status)}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[200px] rounded-lg p-2 transition-colors',
          isOver ? 'bg-mia-100' : 'bg-muted/30'
        )}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} currentUserId={currentUserId} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <EmptyState
            icon={status === 'done' ? '🎉' : '📭'}
            title={status === 'done' ? 'Rien à faire ici !' : 'Colonne vide'}
            description={status === 'todo' ? 'Crée une tâche pour commencer' : undefined}
          />
        )}
      </div>
    </div>
  )
}
