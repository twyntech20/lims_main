import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Filter } from 'lucide-react'
import WorkQueueTable from '@/components/work-queue/WorkQueueTable'
import { RESULT_QUEUE_SELECT, REVIEWER_SELECT } from '@/lib/queries/result-queue'
import { workflowState, isOverdue, type WorkflowState } from '@/lib/workflow'
import { Page, PageHeader, Tabs, Toolbar, Select, SearchField, buttonClass } from '@/components/ui/primitives'

interface SearchParams { status?: string; category?: string; priority?: string; due?: string; q?: string }
interface Props { searchParams: Promise<SearchParams> }

const TAB_STATE: Record<string, WorkflowState> = {
  pending:  'awaiting_entry',
  entered:  'awaiting_review',
  returned: 'returned',
  reviewed: 'in_review',
  approved: 'approved',
  released: 'released',
}

export default async function AnalystWorkQueuePage({ searchParams }: Props) {
  const sp = await searchParams
  const { status, category, priority, due, q } = sp
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Reviewers available to assign to — matches the authorization check in
  // submitSampleForReview (analyst with can_review, or admin/manager).
  const { data: reviewerProfiles } = await supabase
    .from('profiles')
    .select(REVIEWER_SELECT)
    .or('can_review.eq.true,role.in.(admin,manager)')
    .eq('is_active', true)
    .neq('id', user.id)
    .order('first_name')

  let query = supabase
    .from('sample_tests')
    .select(RESULT_QUEUE_SELECT)
    .order('entered_at', { ascending: true, nullsFirst: true })

  if (category) query = query.eq('tests.category', category)

  const { data: sampleTests } = await query

  // Only tests on orders assigned to this analyst, or tests they entered
  // themselves — approved results stay visible so Analyst 1 sees the
  // outcome of their own submissions, not just the open work.
  const mine = ((sampleTests ?? []) as any[]).filter(st =>
    st.samples?.orders?.assigned_analyst_id === user.id ||
    st.entered_by_profile?.id === user.id,
  )

  const stateOf = (st: any): WorkflowState => workflowState({
    status: st.status,
    returned_at: st.returned_at,
    assigned_reviewer_id: st.assigned_reviewer_id,
    order_released_at: st.samples?.orders?.released_at,
  })

  const scoped = mine.filter(st => {
    if (priority && st.samples?.orders?.priority !== priority) return false
    if (due === 'overdue' && !isOverdue(st.samples?.orders?.date_due)) return false
    if (q) {
      const hay = [st.samples?.orders?.order_number, st.samples?.sample_id, st.tests?.name, st.tests?.code]
        .filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  const rows = status ? scoped.filter(st => stateOf(st) === TAB_STATE[status]) : scoped
  const n = (s: WorkflowState) => scoped.filter(st => stateOf(st) === s).length

  const href = (tab: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== 'status') as [string, string][])
    if (tab) p.set('status', tab)
    const qs = p.toString()
    return `/analyst/work-queue${qs ? `?${qs}` : ''}`
  }

  const tabs = [
    { key: '',         label: 'All',           href: href(''),         count: scoped.length,        active: !status },
    { key: 'pending',  label: 'Pending',       href: href('pending'),  count: n('awaiting_entry'),  active: status === 'pending' },
    { key: 'returned', label: 'Returned to me',href: href('returned'), count: n('returned'),        active: status === 'returned' },
    { key: 'entered',  label: 'In progress',   href: href('entered'),  count: n('awaiting_review'), active: status === 'entered' },
    { key: 'reviewed', label: 'Review',        href: href('reviewed'), count: n('in_review'),       active: status === 'reviewed' },
    { key: 'approved', label: 'Approved',      href: href('approved'), count: n('approved'),        active: status === 'approved' },
    { key: 'released', label: 'Released',      href: href('released'), count: n('released'),        active: status === 'released' },
  ]

  const actionable = n('awaiting_entry') + n('returned') + n('awaiting_review')

  return (
    <Page wide>
      <PageHeader
        title="My Work Queue"
        meta={
          actionable === 0
            ? 'You have nothing waiting. Approved work stays listed for reference.'
            : <>{actionable} item{actionable === 1 ? '' : 's'} requiring your attention · {n('in_review')} with reviewers</>
        }
      />

      <div className="mb-3"><Tabs items={tabs} /></div>

      <form>
        {status && <input type="hidden" name="status" value={status} />}
        <Toolbar>
          <SearchField defaultValue={q} placeholder="Search order, sample or test…" />
          <Select name="category" defaultValue={category ?? ''} aria-label="Category">
            <option value="">All categories</option>
            <option value="chemistry">Chemistry</option>
            <option value="microbiology">Microbiology</option>
          </Select>
          <Select name="priority" defaultValue={priority ?? ''} aria-label="Priority">
            <option value="">All priorities</option>
            <option value="same_day">STAT (same day)</option>
            <option value="priority_24h">24 hour</option>
            <option value="priority_48h">48 hour</option>
            <option value="normal">Normal</option>
          </Select>
          <Select name="due" defaultValue={due ?? ''} aria-label="Due date">
            <option value="">Any due date</option>
            <option value="overdue">Overdue</option>
          </Select>
          <button type="submit" className={buttonClass('secondary', 'sm')}>
            <Filter className="h-3 w-3" /> Apply
          </button>
          <span className="ml-auto text-[12px] text-ink-3 tabular">{rows.length} shown</span>
        </Toolbar>
      </form>

      <WorkQueueTable rows={rows as any} orderBasePath="/analyst/orders" reviewers={reviewerProfiles ?? []} />
    </Page>
  )
}
