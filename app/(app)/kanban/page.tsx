'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { TaskDetailDrawer } from '@/components/task/TaskDetailDrawer'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { TaskWithRelations } from '@/lib/supabase/database.types'

export default function KanbanPage() {
  const searchParams = useSearchParams()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newTaskStatus, setNewTaskStatus] = useState<'todo' | 'in_progress' | 'done'>('todo')
  const [createOpen, setCreateOpen] = useState(false)

  const filters = {
    status: searchParams.get('status') ?? undefined,
    priority: searchParams.get('priority') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    assignee: searchParams.get('assignee') ?? undefined,
  }

  function handleTaskClick(task: TaskWithRelations) {
    setSelectedTask(task)
    setDrawerOpen(true)
  }

  function handleAddTask(status: 'todo' | 'in_progress' | 'done') {
    setNewTaskStatus(status)
    setSelectedTask(null)
    setCreateOpen(true)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-semibold text-mia-900">Kanban</h1>
        <Button className="bg-mia-900 hover:bg-mia-800 text-white" onClick={() => handleAddTask('todo')}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle tâche
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard filters={filters} onTaskClick={handleTaskClick} onAddTask={handleAddTask} onOpenCreate={() => handleAddTask('todo')} />
      </div>
      <TaskDetailDrawer task={selectedTask} open={drawerOpen} onClose={() => { setDrawerOpen(false); setSelectedTask(null) }} />
      <TaskDetailDrawer task={null} defaultStatus={newTaskStatus} open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
