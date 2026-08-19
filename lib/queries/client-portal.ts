import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Resolves the client record a portal user belongs to.
 *
 * A portal login is linked to its organisation by name — profiles.company_name
 * matched against clients.client_name — because there is no foreign key between
 * the two. Every client-portal screen must resolve ownership the same way, so
 * the rule lives here rather than being restated per page: the order list and
 * the order detail page previously disagreed about what "my order" meant, and
 * an order the lab raised on the client's behalf listed but 404'd when opened.
 *
 * Returns null when the profile has no company set, or no client matches it.
 */
export async function resolvePortalClientId(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name')
    .eq('id', userId)
    .single()

  if (!profile?.company_name) return null

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .ilike('client_name', profile.company_name)
    .single()

  return client?.id ?? null
}

/**
 * Whether a portal user may view an order.
 *
 * Ownership is the client the order belongs to. Orders the user submitted
 * themselves are also theirs, which covers any legacy row saved without a
 * client_id — the self-service path sets both fields today.
 */
export function canPortalUserViewOrder(
  order: { client_id?: string | null; created_by?: string | null },
  clientId: string | null,
  userId: string,
): boolean {
  if (clientId && order.client_id === clientId) return true
  return !!order.created_by && order.created_by === userId
}
