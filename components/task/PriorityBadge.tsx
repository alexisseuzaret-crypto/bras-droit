import { Badge } from '@/components/ui/badge'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants'

export function PriorityBadge({ priority }: { priority: number }) {
  return (
    <Badge
      variant="outline"
      className="text-xs font-semibold border"
      style={{ borderColor: PRIORITY_COLORS[priority], color: PRIORITY_COLORS[priority] }}
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  )
}
