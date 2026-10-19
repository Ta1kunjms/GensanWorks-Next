import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sanitizeNextPath } from '@/lib/supabase-middleware'
import {
  hasDeclinedOAuthConsent,
  hasRecordedOAuthConsent,
  isOAuthUser,
  resolveCallbackDestination,
} from '@/lib/google-consent'
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

// This callback never creates a profile.
// - Email users complete sign-in only with exactly one active role-profile row.
// - Google (OAuth) is a jobseeker-only path routed by the consent gate: until
//   privacy consent exists the user is sent to /auth/consent. A user who
//   deactivated themselves by declining may reconsider there; any other inactive,
//   admin, employer, conflicting, or unreadable profile is denied.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const failure = NextResponse.redirect(new URL(FAILURE_PATH, origin))

  if (!code) return failure

  const supabase = await createClient()
  const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
  if (sessionError || !data.user) return failure

  const user = data.user
  const userId = user.id

  let lookups: RoleProfileLookup[] = []
  let role: ProfileRole | null = null
  let decisionStatus: ReturnType<typeof decideProfileRole>['status'] = 'error'
  try {
    lookups = await Promise.all(
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
    const decision = decideProfileRole(lookups)
    decisionStatus = decision.status
    role = roleFromDecision(decision)
  } catch {
    role = null
    decisionStatus = 'error'
  }

  if (isOAuthUser(user)) {
    // Only a single inactive jobseeker row carrying this user's own decline marker
    // may reconsider; admin- or deletion-driven deactivations have no marker.
    const inactiveRole = lookups.find((l) => l.row !== null)?.role
    const mayReconsider =
      decisionStatus === 'inactive' &&
      inactiveRole === 'jobseeker' &&
      hasDeclinedOAuthConsent(user) &&
      !hasRecordedOAuthConsent(user)
    const allowed =
      (decisionStatus === 'ok' && role === 'jobseeker') || decisionStatus === 'none' || mayReconsider

    if (!allowed) {
      await supabase.auth.signOut().catch(() => undefined)
      return failure
    }

    let oauthRole: 'jobseeker' | null = null
    let profileHasConsent = false
    if (role === 'jobseeker') {
      oauthRole = role
      const { data: consentRow, error: consentError } = await supabase
        .from('jobseekers')
        .select('consent_given_at')
        .eq('id', userId)
        .maybeSingle()
      profileHasConsent = !consentError && Boolean(consentRow?.consent_given_at)
    }

    const destination = resolveCallbackDestination({ user, role: oauthRole, profileHasConsent })
    if (destination === FAILURE_PATH) {
      await supabase.auth.signOut().catch(() => undefined)
      return failure
    }
    return NextResponse.redirect(new URL(destination, origin))
  }

  if (!role) {
    // No, inactive, conflicting, or unreadable profile: end the session and deny.
    await supabase.auth.signOut().catch(() => undefined)
    return failure
  }

  const next = sanitizeNextPath(searchParams.get('next'), origin)
  return NextResponse.redirect(new URL(next ?? DASHBOARDS[role], origin))
}
