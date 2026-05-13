'use client'

import { useRef, useEffect } from 'react'
import { Draggable } from '@fullcalendar/interaction'
import { useTasks } from '@/lib/queries/tasks'
import { useCurrentProfile } from '@/lib/queries/profiles'
import { PriorityBadge } from '@/components/task/PriorityBadge'
import { minutesToDisplay } from '@/lib/utils'
import { EmptyState } from '@/components/shared/EmptyState'

export function TaskPalette({ userId: overrideUserId }: { userId?: string } = {}) {
  const { data: profile } = useCurrentProfile()
  const taskFilters = overrideUserId
    ? { assignee: overrideUserId }
    : { userId: profile?.id, mine: true }
  const { data: tasks = [] } = useTasks(taskFilters)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const draggable = new Draggable(containerRef.current, {
      itemSelector: '[data-event]',
      eventData: el => ({
        id: el.dataset.id,
        title: el.dataset.title,
        duration: { minutes: parseInt(el.dataset.duration ?? '30') },
        color: el.dataset.color ?? '#5C6BAA',
        extendedProps: { taskId: el.dataset.id },
      }),
    })
    return () => draggable.destroy()
  }, [])

  const unscheduled = tasks.filter(t => t.status !== 'done')

  return (
    <div className="w-80 flex-shrink-0 border-r bg-muted/20 flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Tâches à planifier</h3>
        <p className="text-xs text-muted-foreground">{unscheduled.length} tâche{unscheduled.length > 1 ? 's' : ''}</p>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {unscheduled.length === 0 && <EmptyState icon="🎉" title="Tout est planifié !" />}
        {unscheduled.map(task => (
          <div
            key={task.id}
            data-event
            data-id={task.id}
            data-title={task.title}
            data-duration={task.estimated_minutes ?? 30}
            data-color={task.category?.color ?? '#5C6BAA'}
            className="p-2 bg-white border rounded-md cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow select-none"
          >
            <p className="text-sm font-medium line-clamp-1">{task.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <PriorityBadge priority={task.priority} />
              {task.estimated_minutes && <span className="text-xs text-muted-foreground">{minutesToDisplay(task.estimated_minutes)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
