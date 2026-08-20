import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldX } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DENIAL_COPY, portalForRole, portalHome } from '@/lib/auth/portal'
import { buttonClass } from '@/components/ui/primitives'

/**
 * Shown when a signed-in user reaches the portal they do not belong to.
 *
 * The portal that refused them is derived from their real, server-side
 * role rather than from the URL: a client can only ever have been refused
 * by the staff portal, and staff only by the client portal. Nothing here
 * reads a query parameter, so the message cannot be spoofed, and no
 * protected data is loaded to render it.
 */
export default async function AccessDeniedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile as { role?: string } | null)?.role
  // The portal that refused them is the one they do not belong to.
  const deniedPortal = portalForRole(role) === 'staff' ? 'client' : 'staff'
  const copy = DENIAL_COPY[deniedPortal]

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-crit-bg">
          <ShieldX className="h-5 w-5 text-crit-fg" />
        </span>

        <h1 className="text-[16px] font-semibold text-ink">{copy.title}</h1>
        <p className="mt-1.5 text-[13px] text-ink-3">{copy.body}</p>

        <Link href={portalHome(role)} className={buttonClass('primary', 'md', 'mt-5 w-full')}>
          {copy.cta}
        </Link>

        <p className="mt-4 text-[11.5px] text-ink-4">
          Connecté en tant que {user.email}
        </p>
      </div>
    </main>
  )
}
