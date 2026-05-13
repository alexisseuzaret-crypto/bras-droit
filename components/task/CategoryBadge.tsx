import { Badge } from '@/components/ui/badge'
import type { Category } from '@/lib/supabase/database.types'

export function CategoryBadge({ category }: { category: Pick<Category, 'name' | 'color'> | null }) {
  if (!category) return null
  return (
    <Badge
      variant="outline"
      className="text-xs max-w-[120px] truncate"
      style={{ borderColor: category.color, color: category.color }}
    >
      {category.name}
    </Badge>
  )
}
