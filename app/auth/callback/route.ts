import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!sessionError && data.user) {
      // Fetch the user's role from the public.users table
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (!roleError && userData?.role) {
        // If we have a role, redirect to that portal's dashboard
        const roleRedirect = `/${userData.role}/dashboard`
        return NextResponse.redirect(`${origin}${roleRedirect}`)
      }

      // If no role found (new user), fall back to the "next" param or jobseeker dashboard
      return NextResponse.redirect(`${origin}${next ?? '/jobseeker/dashboard'}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

