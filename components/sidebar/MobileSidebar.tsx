'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import type { Profile } from '@/lib/supabase/database.types'

export function MobileSidebar({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden fixed top-0 left-0 z-50 p-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" size="icon" className="bg-white shadow-md"><Menu className="h-5 w-5" /></Button>} />
        <SheetContent side="left" className="p-0 w-[280px]">
          <Sidebar profile={profile} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
