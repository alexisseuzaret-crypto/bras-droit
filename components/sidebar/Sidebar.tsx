'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, Calendar, BarChart2, Settings, ListTodo } from 'lucide-react'
import { SidebarFilter } from './SidebarFilter'
import { SidebarFooter } from './SidebarFooter'
import { cn } from '@/lib/utils'
import { useCategoriesWithCount } from '@/lib/queries/categories'
import { useAllProfiles } from '@/lib/queries/profiles'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants'
import type { Profile, Role } from '@/lib/supabase/database.types'

const ROLE_ORDER: Role[] = ['direction', 'daf', 'responsable_bu', 'conseiller_senior', 'sales', 'consultant_junior', 'bras_droit']

const ROLE_SECTION_LABELS: Record<Role, string> = {
  direction: 'Direction',
  daf: 'DAF',
  responsable_bu: 'Responsables BU',
  conseiller_senior: 'Conseillers seniors',
  sales: 'Sales',
  consultant_junior: 'Consultants juniors',
  bras_droit: 'Bras droits',
}

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: categories = [] } = useCategoriesWithCount()
  const { data: profiles = [] } = useAllProfiles()

  const canSeeOverview = ['direction', 'daf', 'conseiller_senior'].includes(profile.role)
  const canSeeAdmin = profile.role === 'direction'

  const navItems = [
    { href: '/kanban', icon: LayoutGrid, label: 'Kanban' },
    { href: '/calendar', icon: Calendar, label: 'Calendrier' },
    ...(canSeeOverview ? [{ href: '/overview', icon: BarChart2, label: "Vue d'ensemble" }] : []),
    ...(canSeeAdmin ? [{ href: '/admin/categories', icon: Settings, label: 'Admin' }] : []),
  ]

  const otherProfiles = profiles.filter(p => p.id !== profile.id)

  const profilesByRole = ROLE_ORDER.reduce((acc, role) => {
    const group = otherProfiles.filter(p => p.role === role)
    if (group.length) acc[role] = group
    return acc
  }, {} as Partial<Record<Role, Profile[]>>)

  return (
    <aside className="w-[280px] flex-shrink-0 bg-mia-900 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-mia-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/10 rounded-md flex items-center justify-center text-white font-bold text-sm">M</div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Bras Droit</p>
            <p className="text-mia-500 text-xs mt-0.5">Mister IA</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Reset filtres */}
        <button
          onClick={() => router.push(pathname.split('?')[0])}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/70 hover:bg-mia-800 hover:text-white transition-colors"
        >
          <ListTodo className="h-4 w-4" />
          Toutes les tâches
        </button>

        {/* Statut */}
        <div>
          <p className="text-xs font-semibold text-mia-500 uppercase tracking-wider px-3 mb-1">Statut</p>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <SidebarFilter key={value} paramKey="status" paramValue={value} label={label} dot={STATUS_COLORS[value]} />
          ))}
        </div>

        {/* Priorité */}
        <div>
          <p className="text-xs font-semibold text-mia-500 uppercase tracking-wider px-3 mb-1">Priorité</p>
          {[1, 2, 3, 4, 5].map(p => (
            <SidebarFilter key={p} paramKey="priority" paramValue={String(p)} label={PRIORITY_LABELS[p]} dot={PRIORITY_COLORS[p]} />
          ))}
        </div>

        {/* Catégories */}
        <div>
          <p className="text-xs font-semibold text-mia-500 uppercase tracking-wider px-3 mb-1">Catégories</p>
          {categories.map(cat => (
            <SidebarFilter key={cat.id} paramKey="category" paramValue={cat.id} label={cat.name} dot={cat.color} count={cat.tasks[0]?.count ?? 0} />
          ))}
        </div>

        {/* Assigné à — groupé par rôle */}
        <div>
          <p className="text-xs font-semibold text-mia-500 uppercase tracking-wider px-3 mb-1">Assigné à</p>
          <SidebarFilter paramKey="assignee" paramValue="me" label="Moi" />
          {ROLE_ORDER.filter(role => profilesByRole[role]).map(role => (
            <div key={role}>
              <p className="text-xs text-mia-400 uppercase tracking-wider px-3 mt-3 mb-1">
                {ROLE_SECTION_LABELS[role]}
              </p>
              {profilesByRole[role]!.map(p => (
                <SidebarFilter key={p.id} paramKey="assignee" paramValue={p.id} label={p.full_name} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 border-t border-mia-800 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
            pathname.startsWith(href) ? 'bg-mia-700 text-white' : 'text-white/70 hover:bg-mia-800 hover:text-white'
          )}>
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <SidebarFooter profile={profile} />
    </aside>
  )
}
