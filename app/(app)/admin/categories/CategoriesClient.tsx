'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CategoryForm } from '@/components/admin/CategoryForm'
import { useCategoriesWithCount } from '@/lib/queries/categories'
import { Plus, Pencil } from 'lucide-react'
import type { Category } from '@/lib/supabase/database.types'

export function CategoriesClient() {
  const { data: categories = [], isLoading } = useCategoriesWithCount()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>()

  const openCreate = () => { setEditing(undefined); setOpen(true) }
  const openEdit = (cat: Category) => { setEditing(cat); setOpen(true) }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catégories</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérer les catégories de tâches</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nouvelle catégorie</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const taskCount = cat.tasks?.[0]?.count ?? 0
            return (
              <Card key={cat.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{taskCount} tâche{taskCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
          </DialogHeader>
          <CategoryForm category={editing} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
