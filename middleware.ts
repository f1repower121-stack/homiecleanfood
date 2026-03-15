import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isPreview = request.nextUrl.searchParams.get('preview') === '1'
  const isDev = process.env.NODE_ENV === 'development'

  if (!session && isDashboard && !(isDev && isPreview)) {
    return NextResponse.redirect(new URL('/signin?redirect=' + request.nextUrl.pathname, request.url))
  }
  return response
}

export const config = { matcher: ['/dashboard', '/dashboard/:path*'] }
