'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Compte créé — bienvenue !')
      router.push('/kanban')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mia-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-10 h-10 bg-mia-900 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-2">
            M
          </div>
          <CardTitle className="text-mia-900">Bras Droit</CardTitle>
          <CardDescription>Mister IA — Créer un compte</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Prénom Nom" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@mister-ia.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full bg-mia-900 hover:bg-mia-800 text-white" disabled={loading}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-mia-500 hover:underline">Se connecter</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
