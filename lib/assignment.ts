import type { createClient } from '@/lib/supabase/server'
import { isQualifiedForOrder, orderLabCategories } from '@/lib/workflow'

/* Matches how the server actions type the request-scoped client. */
type Db = Awaited<ReturnType<typeof createClient>>

/* Statuses that take an order out of circulation. Mirrors the dashboard's
   CLOSED list so "open orders" means the same thing here as it does there. */
const CLOSED_STATUSES = ['completed', 'cancelled']

/** Shape of the nested tests-per-order read, narrowed from the query. */
interface SampleTestRow { tests: { category: string | null } | null }
interface SampleRow { sample_tests: SampleTestRow[] | null }

interface Candidate {
  id: string
  first_name: string | null
  role: string | null
  specialty_chemistry: boolean | null
  specialty_microbiology: boolean | null
}

/**
 * Picks the analyst an order should go to, and assigns it.
 *
 * Order-level by design: the schema holds one analyst per order, so a mixed
 * chemistry/microbiology order goes to a single analyst covering both
 * departments rather than being split per test.
 *
 * Never throws. Assignment is a convenience on top of order creation, and an
 * order that could not be routed is a normal state the workflow already
 * handles — an administrator assigns it by hand through the protected picker.
 * Returning null leaves assigned_analyst_id untouched.
 */
export async function autoAssignAnalyst(
  supabase: Db,
  orderId: string,
): Promise<string | null> {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, assigned_analyst_id')
      .eq('id', orderId)
      .single()
    if (orderError || !order) return null

    // Never touch an order that already has an analyst, and never route one
    // that was created already closed.
    if (order.assigned_analyst_id) return null
    if (CLOSED_STATUSES.includes(order.status)) return null

    // The departments the order covers, read from the catalog rather than the
    // submitted form, so the decision is based on what was actually stored.
    const { data: sampleRows, error: testsError } = await supabase
      .from('samples')
      .select('sample_tests ( tests ( category ) )')
      .eq('order_id', orderId)
    if (testsError) return null

    const categories = ((sampleRows ?? []) as unknown as SampleRow[]).flatMap(sample =>
      (sample.sample_tests ?? []).map(st => st.tests?.category ?? null),
    )
    // No recognisable department means nothing to match a specialty against.
    // Guessing an analyst here would be arbitrary, so leave it for a human.
    if (orderLabCategories(categories).length === 0) return null

    const { data: analysts, error: analystError } = await supabase
      .from('profiles')
      .select('id, first_name, role, specialty_chemistry, specialty_microbiology')
      .eq('role', 'analyst')
      .eq('is_active', true)
      .is('deleted_at', null)
    if (analystError || !analysts?.length) return null

    const qualified = (analysts as Candidate[]).filter(a =>
      // An analyst with no specialty recorded passes isQualifiedForCategory —
      // that exemption exists so result entry does not lock out accounts that
      // predate specialty being captured. Automatic routing is a different
      // decision: it must positively know someone belongs to the department
      // before handing them work, so unconfigured accounts are skipped here
      // while the manual picker keeps treating them as before.
      (a.specialty_chemistry === true || a.specialty_microbiology === true) &&
      isQualifiedForOrder(a, categories),
    )
    if (qualified.length === 0) return null

    /* Workload is open orders already on the analyst's plate, using the same
       order-level model the rest of the app assigns with. Released and
       cancelled work is finished and does not count against capacity. */
    const { data: openOrders, error: loadError } = await supabase
      .from('orders')
      .select('assigned_analyst_id')
      .in('assigned_analyst_id', qualified.map(a => a.id))
      .not('status', 'in', `(${CLOSED_STATUSES.join(',')})`)
    if (loadError) return null

    const load = new Map<string, number>(qualified.map(a => [a.id, 0]))
    for (const row of (openOrders ?? []) as { assigned_analyst_id: string | null }[]) {
      const id = row.assigned_analyst_id
      if (id && load.has(id)) load.set(id, (load.get(id) ?? 0) + 1)
    }

    // Least loaded wins; ties break on first_name then id so the same inputs
    // always produce the same analyst.
    const chosen = [...qualified].sort((a, b) => {
      const byLoad = (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0)
      if (byLoad !== 0) return byLoad
      const byName = (a.first_name ?? '').localeCompare(b.first_name ?? '')
      if (byName !== 0) return byName
      return a.id.localeCompare(b.id)
    })[0]
    if (!chosen) return null

    /* Same three columns the manual path writes, so an automatically routed
       order is indistinguishable downstream — the existing audit trigger and
       the order_assigned notification both fire off this update. */
    const { error: assignError } = await supabase
      .from('orders')
      .update({
        assigned_analyst_id: chosen.id,
        status: 'in_progress',
        date_assigned: new Date().toISOString(),
      })
      .eq('id', orderId)
      .is('assigned_analyst_id', null)
    if (assignError) return null

    return chosen.id
  } catch {
    // An order that exists but is unassigned is recoverable; an order
    // creation that failed after the rows were written is not.
    return null
  }
}
