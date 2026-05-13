'use client'

import { TaskPalette } from '@/components/calendar/TaskPalette'
import { CalendarView } from '@/components/calendar/CalendarView'

export default function CalendarPage() {
  return (
    <div className="h-full flex">
      <TaskPalette />
      <CalendarView />
    </div>
  )
}
