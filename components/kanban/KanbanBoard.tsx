'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { useTasks, useReorderTasks } from '@/lib/queries/tasks'
import { useCurrentProfile } from '@/lib/queries/profiles'
import type { TaskWithRelations } from '@/lib/supabase/database.types'
import { toast } from 'sonner'

const STATUSES = ['todo', 'in_progress', 'done'] as const

interface KanbanBoardProps {
  filters: { status?: string; priority?: string; category?: string; assignee?: string }
  onTaskClick: (task: TaskWithRelations) => void
  onAddTask: (status: 'todo' | 'in_progress' | 'done') => void
  onOpenCreate?: () => void
}

export function KanbanBoard({ filters, onTaskClick, onAddTask, onOpenCreate }: KanbanBoardProps) {
  const { data: profile } = useCurrentProfile()
  const { data: tasks = [], isLoading } = useTasks({ ...filters, userId: profile?.id })
  const reorderTasks = useReorderTasks()
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const tasksByStatus = useCallback(
    (status: string) => tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position),
    [tasks]
  )

  useEffect(() => {
    if (!onOpenCreate) return
    const handler = () => onOpenCreate()
    window.addEventListener('open-new-task', handler)
    return () => window.removeEventListener('open-new-task', handler)
  }, [onOpenCreate])

  function handleDragStart({ active }: DragStartEvent) {
    const task = tasks.find(t => t.id === active.id)
    if (task) setActiveTask(task)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null)
    if (!over) return
    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask) return

    const overStatus = STATUSES.find(s => s === over.id)
    const overTask = tasks.find(t => t.id === over.id)
    const targetStatus = overStatus ?? overTask?.status ?? draggedTask.status
    const statusChanged = targetStatus !== draggedTask.status

    const columnTasks = tasksByStatus(targetStatus)
    let reordered: TaskWithRelations[]

    if (statusChanged) {
      reordered = [...columnTasks, { ...draggedTask, status: targetStatus as 'todo' | 'in_progress' | 'done' }]
    } else {
      const oldIdx = columnTasks.findIndex(t => t.id === active.id)
      const newIdx = overTask ? columnTasks.findIndex(t => t.id === over.id) : columnTasks.length - 1
      reordered = arrayMove(columnTasks, oldIdx, newIdx)
    }

    const updates = reordered.map((t, i) => ({
      id: t.id,
      position: i,
      ...(t.id === draggedTask.id && statusChanged ? { status: targetStatus } : {}),
    }))

    try {
      await reorderTasks.mutateAsync(updates)
      if (statusChanged) toast.success(`Déplacé vers "${targetStatus === 'todo' ? 'À faire' : targetStatus === 'in_progress' ? 'En cours' : 'Terminée'}"`)
    } catch {
      toast.error('Erreur lors du déplacement')
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 p-6">
        {STATUSES.map(s => <div key={s} className="w-72 h-96 bg-muted animate-pulse rounded-lg" />)}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-6 overflow-x-auto h-full">
        {STATUSES.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus(status)}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  )
}
