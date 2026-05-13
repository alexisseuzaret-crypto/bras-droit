'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { TaskStepsEditor } from './TaskStepsEditor'
import { TaskForm } from './TaskForm'
import { useUpdateTask, useDeleteTask } from '@/lib/queries/tasks'
import { useCategories } from '@/lib/queries/categories'
import { useAllProfiles } from '@/lib/queries/profiles'
import { formatDate, minutesToDisplay } from '@/lib/utils'
import { PRIORITY_LABELS, STATUS_LABELS } from '@/lib/constants'
import { Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { TaskWithRelations } from '@/lib/supabase/database.types'

interface TaskDetailDrawerProps {
  task: TaskWithRelations | null
  open: boolean
  onClose: () => void
  defaultStatus?: 'todo' | 'in_progress' | 'done'
}

export function TaskDetailDrawer({ task, open, onClose, defaultStatus = 'todo' }: TaskDetailDrawerProps) {
  const { data: categories = [] } = useCategories()
  const { data: profiles = [] } = useAllProfiles()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    if (!task) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    await deleteTask.mutateAsync(task.id)
    toast.success('Tâche supprimée')
    onClose()
    setConfirmDelete(false)
  }

  async function handleUpdate(field: string, value: unknown) {
    if (!task) return
    await updateTask.mutateAsync({ id: task.id, [field]: value } as Parameters<typeof updateTask.mutateAsync>[0])
    toast.success('Mis à jour')
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { onClose(); setConfirmDelete(false) } }}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        {!task ? (
          <>
            <SheetHeader><SheetTitle>Nouvelle tâche</SheetTitle></SheetHeader>
            <div className="mt-6"><TaskForm defaultStatus={defaultStatus} onSuccess={onClose} /></div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>
                <input
                  className="w-full text-lg font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-mia-500 rounded px-1 -mx-1"
                  defaultValue={task.title}
                  onBlur={e => { if (e.target.value.trim() && e.target.value !== task.title) handleUpdate('title', e.target.value.trim()) }}
                />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                <Textarea className="mt-1 text-sm" defaultValue={task.description ?? ''} rows={3} placeholder="Ajouter une description..."
                  onBlur={e => { if (e.target.value !== (task.description ?? '')) handleUpdate('description', e.target.value || null) }} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Statut</label>
                  <Select value={task.status} onValueChange={v => v && handleUpdate('status', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Priorité</label>
                  <Select value={String(task.priority)} onValueChange={v => v && handleUpdate('priority', parseInt(v))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[1,2,3,4,5].map(p => <SelectItem key={p} value={String(p)}>{PRIORITY_LABELS[p]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Catégorie</label>
                  <Select value={task.category_id ?? ''} onValueChange={v => handleUpdate('category_id', v ?? null)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune</SelectItem>
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Assigné à</label>
                  <Select value={task.assignee_id ?? ''} onValueChange={v => handleUpdate('assignee_id', v ?? null)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Non assigné" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Non assigné</SelectItem>
                      {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Échéance</label>
                  <Input type="date" className="h-8 text-xs" defaultValue={task.due_date ?? ''}
                    onBlur={e => handleUpdate('due_date', e.target.value || null)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Temps estimé (min)</label>
                  <Input type="number" className="h-8 text-xs" defaultValue={task.estimated_minutes ?? ''}
                    onBlur={e => handleUpdate('estimated_minutes', parseInt(e.target.value) || null)} />
                </div>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Temps réel : {minutesToDisplay(task.actual_minutes)}
              </div>
              <Separator />
              <TaskStepsEditor taskId={task.id} steps={task.steps} />
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Créé par {task.creator.full_name} le {formatDate(task.created_at)}</p>
                {task.completed_at && <p>Terminé le {formatDate(task.completed_at)}</p>}
              </div>
              <Button variant={confirmDelete ? 'destructive' : 'outline'} className="w-full" onClick={handleDelete} disabled={deleteTask.isPending}>
                <Trash2 className="h-4 w-4 mr-2" />
                {confirmDelete ? 'Confirmer la suppression' : 'Supprimer la tâche'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
