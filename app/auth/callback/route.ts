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

      // 1. Check if the user already exists in public tables
      let { data: seekerData } = await supabase
        .from('jobseekers')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      let userRole = seekerData ? 'jobseeker' : null;

      if (!userRole) {
        let { data: empData } = await supabase
          .from('employers')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        if (empData) userRole = 'employer';
      }

      // 2. If user doesn't exist, create them in jobseekers (Auto-Repair for social logins)
      if (!userRole) {
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'New User';
        const parts = fullName.split(' ');
        const firstName = parts[0] || 'User';
        const lastName = parts.slice(1).join(' ') || '';

        const { error: createError } = await supabase
          .from('jobseekers')
          .insert([
            {
              id: user.id,
              email: user.email,
              first_name: firstName,
              last_name: lastName,
              password_hash: 'auth_managed',
            }
          ]);

        if (!createError) {
          userRole = 'jobseeker';
        }
      }

      if (userRole) {
        const roleRedirect = `/${userRole}/dashboard`
        return NextResponse.redirect(`${origin}${roleRedirect}`)
      }

      // Final fallback
      return NextResponse.redirect(`${origin}${next ?? '/jobseeker/dashboard'}`)
    }

  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

