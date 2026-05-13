'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function KeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.metaKey || e.ctrlKey) return

      switch (e.key.toLowerCase()) {
        case 'k': router.push('/kanban'); break
        case 'c': router.push('/calendar'); break
        case 'd': router.push('/dashboard'); break
        case 'n':
          window.dispatchEvent(new CustomEvent('open-new-task'))
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])

  return null
}
