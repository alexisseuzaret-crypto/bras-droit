'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { useCreateStep, useUpdateStep, useDeleteStep } from '@/lib/queries/tasks'
import type { TaskStep } from '@/lib/supabase/database.types'
import { toast } from 'sonner'

interface TaskStepsEditorProps {
  taskId: string
  steps: TaskStep[]
}

export function TaskStepsEditor({ taskId, steps }: TaskStepsEditorProps) {
  const [newTitle, setNewTitle] = useState('')
  const createStep = useCreateStep()
  const updateStep = useUpdateStep()
  const deleteStep = useDeleteStep()
  const sorted = [...steps].sort((a, b) => a.position - b.position)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await createStep.mutateAsync({ task_id: taskId, title: newTitle.trim(), position: steps.length })
    setNewTitle('')
    toast.success('Étape ajoutée')
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Étapes ({steps.filter(s => s.is_done).length}/{steps.length})
      </p>
      {sorted.map(step => (
        <div key={step.id} className="flex items-center gap-2 group">
          <Checkbox checked={step.is_done} onCheckedChange={() => updateStep.mutateAsync({ id: step.id, is_done: !step.is_done })} className="flex-shrink-0" />
          <span className={`flex-1 text-sm ${step.is_done ? 'line-through text-muted-foreground' : ''}`}>{step.title}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            onClick={() => deleteStep.mutateAsync(step.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <form onSubmit={handleAdd} className="flex gap-2 mt-2">
        <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ajouter une étape..." className="text-sm h-8" />
        <Button type="submit" size="sm" variant="outline" disabled={createStep.isPending}><Plus className="h-3 w-3" /></Button>
      </form>
    </div>
  )
}
