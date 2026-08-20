import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ACCESS_DENIED_PATH, portalAccess, portalForRole } from '@/lib/auth/portal'

const PUBLIC_PATHS = ['/login', '/client-login', '/auth/callback', '/auth/reset-password', '/update-password', '/force-password-change']

const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  manager: '/admin/dashboard',
  analyst: '/analyst/dashboard',
  client: '/client/dashboard',
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    // Redirect logged-in users away from login pages
    if (user && (pathname === '/login' || pathname === '/client-login')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const loginRole = profile?.role ?? 'client'

      // Standing on the login page of a portal you do not belong to is the
      // same mismatch as reaching one of its routes, so it gets the same
      // explanation. Without this the case is silently resolved by sending
      // the user to their own portal, and it is reachable whenever the
      // ?portal hint is absent — a bookmark, a refresh, or the cross-portal
      // link each login page offers.
      const loginPortal = pathname === '/client-login' ? 'client' : 'staff'
      if (portalForRole(loginRole) !== loginPortal) {
        return NextResponse.redirect(new URL(ACCESS_DENIED_PATH, request.url))
      }

      return NextResponse.redirect(new URL(ROLE_HOME[loginRole], request.url))
    }
    return supabaseResponse
  }

  // Not logged in → redirect to appropriate login
  if (!user) {
    const dest = pathname.startsWith('/client') ? '/client-login' : '/login'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Get user role + force_password_change for route protection
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, force_password_change')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'client'

  // Force password change check
  if (profile?.force_password_change === true && pathname !== '/force-password-change') {
    return NextResponse.redirect(new URL('/force-password-change', request.url))
  }

  // Root redirect. The login pages tag which portal was used, so signing in
  // through the wrong one is explained rather than silently redirected.
  if (pathname === '/') {
    const usedPortal = request.nextUrl.searchParams.get('portal')
    if ((usedPortal === 'staff' || usedPortal === 'client') && portalForRole(role) !== usedPortal) {
      return NextResponse.redirect(new URL(ACCESS_DENIED_PATH, request.url))
    }
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }

  // Portal separation. Enforced here, before the route is invoked, so no
  // protected markup or data is produced for a cross-portal request.
  // portalAccess() is the shared rule, also applied by the portal layouts.
  const access = portalAccess(role, pathname)
  if (!access.allowed) {
    return NextResponse.redirect(new URL(ACCESS_DENIED_PATH, request.url))
  }

  // Within the staff portal, /admin remains restricted to admin and manager.
  if (pathname.startsWith('/admin') && !['admin', 'manager'].includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
