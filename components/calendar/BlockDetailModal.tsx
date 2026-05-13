'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUpdateBlock, useDeleteBlock, type CalendarBlockWithTask } from '@/lib/queries/calendar'
import { useUpdateTask } from '@/lib/queries/tasks'
import { minutesToDisplay } from '@/lib/utils'
import { Clock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, differenceInMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'

interface BlockDetailModalProps {
  block: CalendarBlockWithTask | null
  open: boolean
  onClose: () => void
}

export function BlockDetailModal({ block, open, onClose }: BlockDetailModalProps) {
  const updateBlock = useUpdateBlock()
  const deleteBlock = useDeleteBlock()
  const updateTask = useUpdateTask()
  const [notes, setNotes] = useState(block?.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!block) return null

  const duration = differenceInMinutes(new Date(block.end_at), new Date(block.start_at))

  async function handleSaveNotes() {
    await updateBlock.mutateAsync({ id: block!.id, notes })
    toast.success('Notes sauvegardées')
  }

  async function handleSessionDone() {
    await updateTask.mutateAsync({ id: block!.task_id, actual_minutes: duration })
    toast.success(`+${minutesToDisplay(duration)} enregistrés sur la tâche`)
    onClose()
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await deleteBlock.mutateAsync(block!.id)
    toast.success('Bloc supprimé')
    onClose()
    setConfirmDelete(false)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setConfirmDelete(false) } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{block.task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="text-muted-foreground">
            <p>{format(new Date(block.start_at), 'EEEE d MMMM, HH:mm', { locale: fr })} → {format(new Date(block.end_at), 'HH:mm', { locale: fr })}</p>
            <p className="flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />{minutesToDisplay(duration)}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Notes de session</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes sur cette session..." rows={3} className="mt-1" />
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={handleSaveNotes} disabled={updateBlock.isPending}>Sauvegarder les notes</Button>
            <Button className="bg-mia-900 hover:bg-mia-800 text-white" onClick={handleSessionDone}>
              ✓ Session effectuée — enregistrer {minutesToDisplay(duration)}
            </Button>
            <Button variant={confirmDelete ? 'destructive' : 'ghost'} size="sm" onClick={handleDelete}>
              <Trash2 className="h-3 w-3 mr-1" />
              {confirmDelete ? 'Confirmer la suppression' : 'Supprimer le bloc'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
