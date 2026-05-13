'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateCategory, useUpdateCategory } from '@/lib/queries/categories'
import { DEFAULT_CATEGORY_COLORS } from '@/lib/constants'
import { toast } from 'sonner'
import type { Category } from '@/lib/supabase/database.types'

interface Props {
  category?: Category
  onDone: () => void
}

export function CategoryForm({ category, onDone }: Props) {
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? DEFAULT_CATEGORY_COLORS[0])
  const create = useCreateCategory()
  const update = useUpdateCategory()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      if (category) {
        await update.mutateAsync({ id: category.id, name: name.trim(), color })
        toast.success('Catégorie mise à jour')
      } else {
        await create.mutateAsync({ name: name.trim(), color })
        toast.success('Catégorie créée')
      }
      onDone()
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="cat-name">Nom</Label>
        <Input id="cat-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Marketing" className="mt-1" />
      </div>
      <div>
        <Label>Couleur</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {DEFAULT_CATEGORY_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: color === c ? '#fff' : 'transparent', outline: color === c ? `2px solid ${c}` : 'none' }}
            />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 bg-transparent" title="Couleur personnalisée" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>Annuler</Button>
        <Button type="submit" disabled={create.isPending || update.isPending}>
          {category ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  )
}
