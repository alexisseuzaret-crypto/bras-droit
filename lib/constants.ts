export const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4', 5: 'P5',
}

export const PRIORITY_COLORS: Record<number, string> = {
  1: '#EF4444', 2: '#F97316', 3: '#EAB308', 4: '#3B82F6', 5: '#6B7280',
}

export const STATUS_LABELS: Record<string, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminée',
}

export const STATUS_COLORS: Record<string, string> = {
  todo: '#6B7280',
  in_progress: '#F59E0B',
  done: '#10B981',
}

export const DEFAULT_CATEGORY_COLORS = [
  '#1A203D', '#7C3AED', '#0EA5E9', '#F59E0B', '#10B981', '#6B7280',
  '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6',
]
