import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // No `code` doesn't mean failure here: Supabase's hosted /verify endpoint
  // (what the password-recovery email link actually hits) redirects to this
  // URL with the session in a URL hash fragment, not a `code` query param —
  // a fragment this server route can never see, since fragments are never
  // sent over the wire. Forward to `next` regardless so the browser carries
  // that fragment along; the client-side Supabase browser client running on
  // the destination page picks it up via its default detectSessionInUrl
  // behavior. Pages that require a session already redirect unauthenticated
  // visitors to /login on their own, so a genuinely missing/invalid session
  // still ends up in the right place.
  return NextResponse.redirect(`${origin}${next}`)
}
