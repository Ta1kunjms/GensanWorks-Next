import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sanitizeNextPath } from '@/lib/supabase-middleware'
import {
  ROLE_PROFILE_TABLES,
  decideProfileRole,
  roleFromDecision,
  type ProfileRole,
  type RoleProfileLookup,
  type RoleProfileRow,
} from '@/lib/profile-role'

export const dynamic = "force-dynamic";

const FAILURE_PATH = '/auth/auth-code-error'

const DASHBOARDS: Record<ProfileRole, string> = {
  admin: '/admin/dashboard',
  employer: '/employer/dashboard',
  jobseeker: '/jobseeker/dashboard',
}

// Google sign-in is not offered during the pilot (no consent capture on that path).
// This callback never creates a profile: it only completes sign-in for a user who
// already has exactly one active role-profile row, and denies everyone else.
// Blocking direct OAuth account creation requires the Supabase Auth setting
// (Google provider or new-user signup disabled) on the target project.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const failure = NextResponse.redirect(new URL(FAILURE_PATH, origin))

  if (!code) return failure

  const supabase = await createClient()
  const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
  if (sessionError || !data.user) return failure

  const userId = data.user.id

  let role: ProfileRole | null = null
  try {
    const lookups = await Promise.all(
      ROLE_PROFILE_TABLES.map(async ([profileRole, table]): Promise<RoleProfileLookup> => {
        const { data: profile, error } = await supabase
          .from(table)
          .select('id, is_active')
          .eq('id', userId)
          .maybeSingle()
        const row: RoleProfileRow | null = profile ?? null
        return { role: profileRole, row: error ? null : row, failed: Boolean(error) }
      })
    )
    role = roleFromDecision(decideProfileRole(lookups))
  } catch {
    role = null
  }

  if (!role) {
    // No, inactive, conflicting, or unreadable profile: end the session and deny.
    await supabase.auth.signOut().catch(() => undefined)
    return failure
  }

  const next = sanitizeNextPath(searchParams.get('next'), origin)
  return NextResponse.redirect(new URL(next ?? DASHBOARDS[role], origin))
}
