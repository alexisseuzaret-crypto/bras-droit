'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCategories } from '@/lib/queries/categories'
import { useAllProfiles, useCurrentProfile } from '@/lib/queries/profiles'
import { useCreateTask } from '@/lib/queries/tasks'
import { PRIORITY_LABELS } from '@/lib/constants'
import { toast } from 'sonner'

interface TaskFormProps {
  defaultStatus?: 'todo' | 'in_progress' | 'done'
  onSuccess: () => void
}

export function TaskForm({ defaultStatus = 'todo', onSuccess }: TaskFormProps) {
  const { data: profile } = useCurrentProfile()
  const { data: categories = [] } = useCategories()
  const { data: profiles = [] } = useAllProfiles()
  const createTask = useCreateTask()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('3')
  const [categoryId, setCategoryId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    if (!title.trim()) { toast.error('Le titre est requis'); return }

    await createTask.mutateAsync({
      title: title.trim(),
      description: description || undefined,
      status: defaultStatus,
      priority: parseInt(priority),
      category_id: categoryId || null,
      assignee_id: assigneeId || null,
      creator_id: profile.id,
      due_date: dueDate || null,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
    })

    toast.success('Tâche créée')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Titre *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de la tâche" autoFocus required />
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optionnel)" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Priorité</Label>
          <Select value={priority} onValueChange={v => v && setPriority(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5].map(p => <SelectItem key={p} value={String(p)}>{PRIORITY_LABELS[p]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Catégorie</Label>
          <Select value={categoryId} onValueChange={v => setCategoryId(v ?? '')}>
            <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
            <SelectContent>
              {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Assigné à</Label>
          <Select value={assigneeId} onValueChange={v => setAssigneeId(v ?? '')}>
            <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
            <SelectContent>
              {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Échéance</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Temps estimé (minutes)</Label>
          <Input type="number" value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} placeholder="ex: 90" min={0} />
        </div>
      </div>
      <Button type="submit" className="w-full bg-mia-900 hover:bg-mia-800 text-white" disabled={createTask.isPending}>
        {createTask.isPending ? 'Création...' : 'Créer la tâche'}
      </Button>
    </form>
  )
}
