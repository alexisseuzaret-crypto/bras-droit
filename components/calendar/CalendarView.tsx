'use client'

import { useRef, useState, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type DropArg, type EventResizeDoneArg } from '@fullcalendar/interaction'
import type { EventDropArg, EventClickArg } from '@fullcalendar/core'
import { useCalendarBlocks, useCreateBlock, useUpdateBlock, type CalendarBlockWithTask } from '@/lib/queries/calendar'
import { useCurrentProfile } from '@/lib/queries/profiles'
import { BlockDetailModal } from './BlockDetailModal'
import { toast } from 'sonner'

export function CalendarView() {
  const { data: profile } = useCurrentProfile()
  const { data: blocks = [] } = useCalendarBlocks(profile?.id)
  const createBlock = useCreateBlock()
  const updateBlock = useUpdateBlock()
  const [selectedBlock, setSelectedBlock] = useState<CalendarBlockWithTask | null>(null)
  const calRef = useRef<FullCalendar>(null)

  const events = blocks.map(b => {
    const isOtherPrivate = b.is_private && b.user_id !== profile?.id
    return {
      id: b.id,
      title: isOtherPrivate ? 'Indisponible' : b.task.title,
      start: b.start_at,
      end: b.end_at,
      backgroundColor: isOtherPrivate ? '#9CA3AF' : (b.task.category?.color ?? '#5C6BAA'),
      borderColor: isOtherPrivate ? '#9CA3AF' : (b.task.category?.color ?? '#5C6BAA'),
      extendedProps: { blockId: b.id, isPrivate: isOtherPrivate },
    }
  })

  const handleDrop = useCallback(async (info: DropArg) => {
    if (!profile) return
    const taskId = info.draggedEl.dataset.id
    const estimatedMinutes = parseInt(info.draggedEl.dataset.duration ?? '30')
    if (!taskId) return
    const start = info.date
    const end = new Date(start.getTime() + estimatedMinutes * 60 * 1000)
    try {
      await createBlock.mutateAsync({ task_id: taskId, user_id: profile.id, start_at: start.toISOString(), end_at: end.toISOString() })
      toast.success('Bloc planifié')
    } catch {
      toast.error('Erreur lors de la planification')
    }
  }, [profile, createBlock])

  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const blockId = info.event.extendedProps.blockId
    const duration = info.event.end ? info.event.end.getTime() - info.event.start!.getTime() : 30 * 60 * 1000
    try {
      await updateBlock.mutateAsync({ id: blockId, start_at: info.event.start!.toISOString(), end_at: new Date(info.event.start!.getTime() + duration).toISOString() })
      toast.success('Bloc déplacé')
    } catch { info.revert(); toast.error('Erreur') }
  }, [updateBlock])

  const handleResize = useCallback(async (info: EventResizeDoneArg) => {
    const blockId = info.event.extendedProps.blockId
    try {
      await updateBlock.mutateAsync({ id: blockId, end_at: info.event.end!.toISOString() })
      toast.success('Durée mise à jour')
    } catch { info.revert(); toast.error('Erreur') }
  }, [updateBlock])

  const handleEventClick = useCallback((info: EventClickArg) => {
    if (info.event.extendedProps.isPrivate) return
    const blockId = info.event.extendedProps.blockId
    const block = blocks.find(b => b.id === blockId)
    if (block) setSelectedBlock(block)
  }, [blocks])

  return (
    <>
      <div className="flex-1 p-4 overflow-hidden">
        <FullCalendar
          ref={calRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridWeek,dayGridMonth' }}
          locale="fr"
          firstDay={1}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          events={events}
          editable
          droppable
          drop={handleDrop}
          eventDrop={handleEventDrop}
          eventResize={handleResize}
          eventClick={handleEventClick}
          height="100%"
          buttonText={{ today: "Aujourd'hui", week: 'Semaine', day: 'Jour', month: 'Mois' }}
        />
      </div>
      <BlockDetailModal block={selectedBlock} open={!!selectedBlock} onClose={() => setSelectedBlock(null)} />
    </>
  )
}
