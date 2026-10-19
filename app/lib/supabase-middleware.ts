import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { consentGateRedirect } from '@/lib/google-consent'
import {
  ROLE_PROFILE_TABLES,
  decideProfileRole,
  roleFromDecision,
  type ProfileRole,
  type RoleProfileLookup,
  type RoleProfileRow,
} from './profile-role'

// Navigation gating only. API authorization remains authoritative in
// app/lib/api-handler.ts / app/lib/auth.ts (privileged profile-role resolver).

const PORTALS: ReadonlyArray<{ prefix: string; role: ProfileRole; loginPath: string }> = [
  { prefix: '/jobseeker', role: 'jobseeker', loginPath: '/login?role=jobseeker' },
  { prefix: '/employer', role: 'employer', loginPath: '/login?role=employer' },
  { prefix: '/admin', role: 'admin', loginPath: '/login/admin' },
]

const DASHBOARDS: Record<ProfileRole, string> = {
  admin: '/admin/dashboard',
  employer: '/employer/dashboard',
  jobseeker: '/jobseeker/dashboard',
}

const ENTRY_PATHS = ['/login', '/signup', '/']

export type NavigationDecision = { action: 'next' } | { action: 'redirect'; location: string }

// Plain prefix match, as before (e.g. /admin-portal stays admin-gated).
function portalFor(pathname: string) {
  return PORTALS.find((p) => pathname.startsWith(p.prefix))
}

/** True when the navigation decision for this path depends on the user's profile role. */
export function requiresRoleLookup(pathname: string): boolean {
  return portalFor(pathname) !== undefined || ENTRY_PATHS.includes(pathname)
}

/**
 * Pure navigation decision.
 * - Portal paths require a signed-in user whose single active profile role matches
 *   the portal; otherwise redirect to that portal's login.
 * - /login, /signup, and / redirect to a dashboard only for a signed-in user with
 *   a valid role; a user without a valid role stays on the page (no dashboard loop).
 */
export function decideNavigation(
  pathname: string,
  signedIn: boolean,
  role: ProfileRole | null
): NavigationDecision {
  const portal = portalFor(pathname)
  if (portal) {
    return signedIn && role === portal.role
      ? { action: 'next' }
      : { action: 'redirect', location: portal.loginPath }
  }
  if (signedIn && role !== null && ENTRY_PATHS.includes(pathname)) {
    return { action: 'redirect', location: DASHBOARDS[role] }
  }
  return { action: 'next' }
}

/**
 * Returns `next` only when it is a same-origin relative path that begins with exactly
 * one "/". Absolute, protocol-relative ("//host"), backslash, whitespace/control-char,
 * malformed, or cross-origin values return null so the caller uses a safe fallback.
 */
export function sanitizeNextPath(next: string | null, origin: string): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  if (/[\\\s\u0000-\u001f\u007f]/.test(next)) return null
  try {
    const resolved = new URL(next, origin)
    if (resolved.origin !== new URL(origin).origin) return null
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return null
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Google users are held at /auth/consent until privacy consent is recorded.
  // Runs before role gating so an unconsented OAuth user is never sent to login.
  const consentRedirect = consentGateRedirect(pathname, user)
  if (consentRedirect) {
    return NextResponse.redirect(new URL(consentRedirect, request.url))
  }

  // Role comes only from the user's own role-profile rows (id, is_active), read with
  // the user-scoped client. Any lookup error, missing, inactive, or conflicting
  // profile yields no role; there is no metadata role and no default role.
  let role: ProfileRole | null = null
  if (user && requiresRoleLookup(pathname)) {
    try {
      const lookups = await Promise.all(
        ROLE_PROFILE_TABLES.map(async ([profileRole, table]): Promise<RoleProfileLookup> => {
          const { data, error } = await supabase
            .from(table)
            .select('id, is_active')
            .eq('id', user.id)
            .maybeSingle()
          const row: RoleProfileRow | null = data ?? null
          return { role: profileRole, row: error ? null : row, failed: Boolean(error) }
        })
      )
      role = roleFromDecision(decideProfileRole(lookups))
    } catch {
      role = null
    }
  }

  const decision = decideNavigation(pathname, Boolean(user), role)
  if (decision.action === 'redirect') {
    return NextResponse.redirect(new URL(decision.location, request.url))
  }

  return response
}
