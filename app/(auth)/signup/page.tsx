'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { Role } from '@/lib/supabase/database.types'

const ROLE_LABELS: Record<Role, string> = {
  direction: 'Direction',
  conseiller_senior: 'Conseiller senior',
  responsable_bu: 'Responsable BU',
  sales: 'Sales',
  bras_droit: 'Bras droit',
}

interface ManagerOption {
  id: string
  full_name: string
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('bras_droit')
  const [managerId, setManagerId] = useState<string | null>(null)
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (role !== 'bras_droit') return
    supabase
      .from('profiles')
      .select('id, full_name')
      .neq('role', 'bras_droit')
      .order('full_name')
      .then(({ data }) => {
        if (data) setManagers(data as ManagerOption[])
      })
  }, [role, supabase])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          manager_id: role === 'bras_droit' ? managerId : null,
        },
      },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Compte créé — bienvenue !')
      window.location.href = '/kanban'
    }
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
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={v => v && setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {role === 'bras_droit' && (
              <div className="space-y-2">
                <Label>Manager</Label>
                <Select value={managerId ?? ''} onValueChange={v => setManagerId(v || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
