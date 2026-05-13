import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isPast, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null): string {
  if (!date) return ''
  return format(new Date(date), 'd MMM', { locale: fr })
}

export function isDueDateOverdue(date: string | null): boolean {
  if (!date) return false
  const d = new Date(date)
  return isPast(d) && !isToday(d)
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function minutesToDisplay(minutes: number | null): string {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}`
}
