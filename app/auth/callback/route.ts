import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { resolveCallbackDestination } from '@/lib/google-consent'

export const dynamic = "force-dynamic";

// OAuth (Google) callback. This route never creates a profile. Google users
// without recorded privacy consent are sent to /auth/consent; the profile is
// only confirmed (or created) once they accept there.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (!sessionError && data.user) {
      const { user } = data;

      const { data: seekerData } = await supabase
        .from('jobseekers')
        .select('id, consent_given_at')
        .eq('id', user.id)
        .maybeSingle()

      let role: 'jobseeker' | 'employer' | null = null;
      let profileHasConsent = false;

      if (seekerData) {
        role = 'jobseeker';
        profileHasConsent = Boolean(seekerData.consent_given_at);
      } else {
        const { data: empData } = await supabase
          .from('employers')
          .select('id, consent_given_at')
          .eq('id', user.id)
          .maybeSingle()
        if (empData) {
          role = 'employer';
          profileHasConsent = Boolean(empData.consent_given_at);
        }
      }

      const destination = resolveCallbackDestination({ user, role, profileHasConsent })

      if (destination === '/auth/auth-code-error') {
        await supabase.auth.signOut()
      }

      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
