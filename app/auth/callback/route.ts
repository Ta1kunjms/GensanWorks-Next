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
      const { user } = data;

      // 1. Check if the user already exists in the public.users table
      let { data: userData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      // 2. If user doesn't exist in public.users, create them (Auto-Repair)
      if (roleError || !userData) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([
            {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.user_metadata?.name || 'New User',
              role: 'jobseeker', // Default to jobseeker for social logins
            }
          ])
          .select('role')
          .single()

        if (!createError && newUser) {
          userData = newUser
        }
      }

      if (userData?.role) {
        // If we have a role (existing or newly created), redirect to that portal
        const roleRedirect = `/${userData.role}/dashboard`
        return NextResponse.redirect(`${origin}${roleRedirect}`)
      }

      // Final fallback
      return NextResponse.redirect(`${origin}${next ?? '/jobseeker/dashboard'}`)
    }

  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

