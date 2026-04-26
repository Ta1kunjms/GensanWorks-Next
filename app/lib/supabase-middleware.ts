import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
            request: {
              headers: request.headers,
            },
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
            request: {
              headers: request.headers,
            },
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
  
  // Get role from metadata first, then fall back to database if needed
  let role = user?.user_metadata?.role

  if (user && !role) {
    // Fallback: Check the public.users table if metadata is missing (e.g., social login)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userData) {
      role = userData.role
    }
  }

  // Protected routes check
  if (pathname.startsWith('/jobseeker') && role !== 'jobseeker') {
    return NextResponse.redirect(new URL('/login?role=jobseeker', request.url))
  }
  if (pathname.startsWith('/employer') && role !== 'employer') {
    return NextResponse.redirect(new URL('/login?role=employer', request.url))
  }
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/login/admin', request.url))
  }

  // Redirect if already logged in and hitting login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const dashboardPath = role === 'admin' ? '/admin/dashboard' : 
                         role === 'employer' ? '/employer/dashboard' : 
                         '/jobseeker/dashboard'
    return NextResponse.redirect(new URL(dashboardPath, request.url))
  }

  return response
}

