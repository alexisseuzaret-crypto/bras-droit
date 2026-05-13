'use client'

import { useSearchParams } from 'next/navigation'
import { TaskPalette } from '@/components/calendar/TaskPalette'
import { CalendarView } from '@/components/calendar/CalendarView'

export default function CalendarPage() {
  const searchParams = useSearchParams()
  const assignee = searchParams.get('assignee')
  const filterUserId = assignee && assignee !== 'me' ? assignee : undefined

  return (
    <div className="h-full flex">
      <TaskPalette userId={filterUserId} />
      <CalendarView userId={filterUserId} />
    </div>
  )
}
