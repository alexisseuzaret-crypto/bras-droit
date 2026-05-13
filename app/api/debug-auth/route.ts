import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database.types'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const authCookies = allCookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-'))

  const supabase = createServerClient<Database, 'bras_droit'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'bras_droit' },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  let profileResult = null
  let profileError = null
  if (user) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profileResult = data
    profileError = error?.message ?? null
  }

  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
    userError: userError?.message ?? null,
    profile: profileResult,
    profileError,
    authCookiesCount: authCookies.length,
    authCookies: authCookies.map(c => ({ name: c.name, valueLength: c.value.length })),
  })
}
