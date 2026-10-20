import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { sanitizeNextPath } from '@/lib/supabase-middleware'
import {
  OAUTH_ROLE_COOKIE,
  hasDeclinedOAuthConsent,
  hasRecordedOAuthConsent,
  isOAuthUser,
  parseOAuthRole,
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
// - Google (OAuth) serves jobseekers and employers (owner decision 2026-10-21),
//   routed by the consent gate: until privacy consent exists the user is sent to
//   /auth/consent. A user with no profile yet carries the portal they chose
//   (OAUTH_ROLE_COOKIE) to the consent page; an existing profile always keeps its
//   role. A user who deactivated themselves by declining may reconsider; any other
//   inactive, admin, conflicting, or unreadable profile is denied.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const failure = NextResponse.redirect(new URL(FAILURE_PATH, origin))
  failure.cookies.set(OAUTH_ROLE_COOKIE, '', { path: '/', maxAge: 0 })

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
    // Only a single inactive jobseeker/employer row carrying this user's own decline
    // marker may reconsider; admin- or deletion-driven deactivations have no marker.
    const inactiveRole = lookups.find((l) => l.row !== null)?.role
    const mayReconsider =
      decisionStatus === 'inactive' &&
      (inactiveRole === 'jobseeker' || inactiveRole === 'employer') &&
      hasDeclinedOAuthConsent(user) &&
      !hasRecordedOAuthConsent(user)
    const allowed =
      (decisionStatus === 'ok' && (role === 'jobseeker' || role === 'employer')) ||
      decisionStatus === 'none' ||
      mayReconsider

    if (!allowed) {
      await supabase.auth.signOut().catch(() => undefined)
      return failure
    }

    // A self-declined user reconsidering keeps the role of their existing profile.
    let oauthRole: 'jobseeker' | 'employer' | null =
      mayReconsider && (inactiveRole === 'jobseeker' || inactiveRole === 'employer') ? inactiveRole : null
    let profileHasConsent = false
    if (role === 'jobseeker') {
      oauthRole = role
      const { data: consentRow, error: consentError } = await supabase
        .from('jobseekers')
        .select('consent_given_at')
        .eq('id', userId)
        .maybeSingle()
      profileHasConsent = !consentError && Boolean(consentRow?.consent_given_at)
    } else if (role === 'employer') {
      // Clients may read only id/is_active on employers (profile-access-v1); the
      // server-recorded OAuth consent (service-role-only, written together with the
      // employer row's consent by the consent API) stands in for the row's timestamp.
      oauthRole = role
      profileHasConsent = hasRecordedOAuthConsent(user)
    }

    // The chosen portal only matters for a user with no profile yet.
    const cookieStore = await cookies()
    const requestedRole = parseOAuthRole(cookieStore.get(OAUTH_ROLE_COOKIE)?.value)
    const destination = resolveCallbackDestination({ user, role: oauthRole, profileHasConsent, requestedRole })
    if (destination === FAILURE_PATH) {
      await supabase.auth.signOut().catch(() => undefined)
      return failure
    }
    const response = NextResponse.redirect(new URL(destination, origin))
    response.cookies.set(OAUTH_ROLE_COOKIE, '', { path: '/', maxAge: 0 })
    return response
  }

  if (!role) {
    // No, inactive, conflicting, or unreadable profile: end the session and deny.
    await supabase.auth.signOut().catch(() => undefined)
    return failure
  }

  if (role === 'admin') {
    // Admins sign in only at /login/admin with email and password. This callback
    // serves Google sign-in, so it never completes an admin session, including a
    // Google identity that Supabase auto-linked to an admin's email account.
    await supabase.auth.signOut().catch(() => undefined)
    return failure
  }

  const next = sanitizeNextPath(searchParams.get('next'), origin)
  return NextResponse.redirect(new URL(next ?? DASHBOARDS[role], origin))
}
