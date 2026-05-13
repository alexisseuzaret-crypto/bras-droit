'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SidebarFilterProps {
  label: string
  paramKey: string
  paramValue: string
  count?: number
  dot?: string
}

export function SidebarFilter({ label, paramKey, paramValue, count, dot }: SidebarFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const current = searchParams.get(paramKey)
  const isActive = current === paramValue

  function toggle() {
    const params = new URLSearchParams(searchParams.toString())
    if (isActive) params.delete(paramKey)
    else params.set(paramKey, paramValue)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors',
        isActive ? 'bg-mia-700 text-white' : 'text-white/70 hover:bg-mia-800 hover:text-white'
      )}
    >
      <span className="flex items-center gap-2">
        {dot && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />}
        {label}
      </span>
      {count !== undefined && (
        <span className={cn('text-xs', isActive ? 'text-white/80' : 'text-white/40')}>{count}</span>
      )}
    </button>
  )
}
