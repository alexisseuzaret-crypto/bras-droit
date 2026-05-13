'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export function ChangePasswordForm({ userId }: { userId: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères')
      return
    }
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      toast.error(authError.message)
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', userId)

    if (profileError) {
      toast.error('Erreur lors de la mise à jour du profil')
      setLoading(false)
      return
    }

    toast.success('Mot de passe mis à jour')
    window.location.href = '/kanban'
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-10 h-10 bg-mia-900 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-2">
          M
        </div>
        <CardTitle className="text-mia-900">Changement de mot de passe</CardTitle>
        <CardDescription>
          Votre compte utilise un mot de passe temporaire.<br />
          Choisissez un nouveau mot de passe avant de continuer.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmation</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-mia-900 hover:bg-mia-800 text-white" disabled={loading}>
            {loading ? 'Mise à jour...' : 'Valider et continuer'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
