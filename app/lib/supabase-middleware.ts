import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { consentGateRedirect } from '@/lib/google-consent'

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
  const consentRedirect = consentGateRedirect(pathname, user)
  if (consentRedirect) {
    return NextResponse.redirect(new URL(consentRedirect, request.url))
  }

  // Get role from metadata first, then fall back to database if needed
  let role = user?.user_metadata?.role

  if (user && !role) {
    const [{ data: seeker }, { data: emp }, { data: admin }] = await Promise.all([
      supabase.from('jobseekers').select('id').eq('id', user.id).maybeSingle(),
      supabase.from('employers').select('id').eq('id', user.id).maybeSingle(),
      supabase.from('admins').select('id').eq('id', user.id).maybeSingle(),
    ]);

    if (seeker) role = 'jobseeker';
    else if (emp) role = 'employer';
    else if (admin) role = 'admin';
  }

  // Safety check: Ensure role is valid or default it
  const validRoles = ['admin', 'employer', 'jobseeker']
  const finalRole = role && validRoles.includes(role) ? role : 'jobseeker'

  console.log(`[Middleware] Path: ${pathname} | User: ${user?.id} | Role: ${role} | Final: ${finalRole}`)

  // Protected routes check
  if (pathname.startsWith('/jobseeker') && finalRole !== 'jobseeker') {
    console.log(`[Middleware] Unauthorized Jobseeker access, redirecting to login`)
    return NextResponse.redirect(new URL('/login?role=jobseeker', request.url))
  }
  if (pathname.startsWith('/employer') && finalRole !== 'employer') {
    console.log(`[Middleware] Unauthorized Employer access, redirecting to login`)
    return NextResponse.redirect(new URL('/login?role=employer', request.url))
  }
  if (pathname.startsWith('/admin') && finalRole !== 'admin') {
    console.log(`[Middleware] Unauthorized Admin access, redirecting to login`)
    return NextResponse.redirect(new URL('/login/admin', request.url))
  }

  // Redirect if already logged in and hitting login/signup
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    const dashboardPath = finalRole === 'admin' ? '/admin/dashboard' : 
                         finalRole === 'employer' ? '/employer/dashboard' : 
                         '/jobseeker/dashboard'
    
    console.log(`[Middleware] Logged in user on ${pathname}, redirecting to ${dashboardPath}`)
    return NextResponse.redirect(new URL(dashboardPath, request.url))
  }


  return response
}


