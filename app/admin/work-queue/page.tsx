import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import WorkQueueTable from '@/components/work-queue/WorkQueueTable'
import { RESULT_QUEUE_SELECT, REVIEWER_SELECT } from '@/lib/queries/result-queue'
import { workflowState, isOverdue, type WorkflowState } from '@/lib/workflow'
import {
  Page, PageHeader, Tabs, FilterBar, Select, SearchField, ButtonLink,
} from '@/components/ui/primitives'

interface SearchParams {
  status?: string; analyst?: string; reviewer?: string
  category?: string; priority?: string; due?: string; q?: string
}
interface Props { searchParams: Promise<SearchParams> }

/* Tabs are workflow states, not raw statuses — "returned for changes"
   and "released" are the two the enum cannot express on its own. */
const TAB_STATE: Record<string, WorkflowState> = {
  pending:  'awaiting_entry',
  entered:  'awaiting_review',
  returned: 'returned',
  reviewed: 'in_review',
  approved: 'approved',
  released: 'released',
}

export default async function WorkQueuePage({ searchParams }: Props) {
  const sp = await searchParams
  const { status, analyst, reviewer, category, priority, due, q } = sp
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: staff } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('role', ['analyst', 'admin', 'manager'])
    .order('first_name')

  // Reviewers available to assign to — matches the authorization check in
  // submitSampleForReview (analyst with can_review, or admin/manager).
  const { data: reviewerProfiles } = await supabase
    .from('profiles')
    .select(REVIEWER_SELECT)
    .or('can_review.eq.true,role.in.(admin,manager)')
    .eq('is_active', true)
    .order('first_name')

  let query = supabase
    .from('sample_tests')
    .select(RESULT_QUEUE_SELECT)
    .order('entered_at', { ascending: true, nullsFirst: true })

  if (category) query = query.eq('tests.category', category)

  const { data: sampleTests } = await query
  const all = (sampleTests ?? []) as any[]

  const stateOf = (st: any): WorkflowState => workflowState({
    status: st.status,
    returned_at: st.returned_at,
    assigned_reviewer_id: st.assigned_reviewer_id,
    order_released_at: st.samples?.orders?.released_at,
  })

  const matchesFilters = (st: any) => {
    if (analyst  && st.entered_by_profile?.id !== analyst) return false
    if (reviewer === 'me'   && st.assigned_reviewer_id !== user.id) return false
    if (reviewer === 'none' && st.assigned_reviewer_id) return false
    if (reviewer && !['me', 'none'].includes(reviewer) && st.assigned_reviewer_id !== reviewer) return false
    if (priority && st.samples?.orders?.priority !== priority) return false
    if (due === 'overdue' && !isOverdue(st.samples?.orders?.date_due)) return false
    if (due === 'week') {
      const d = st.samples?.orders?.date_due
      if (!d || new Date(d).getTime() > Date.now() + 7 * 86400000) return false
    }
    if (q) {
      const hay = [
        st.samples?.orders?.order_number, st.samples?.sample_id, st.tests?.name,
        st.tests?.code, st.samples?.orders?.clients?.client_name,
      ].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  }

  const scoped = all.filter(matchesFilters)
  const isMine = (st: any) =>
    st.entered_by_profile?.id === user.id ||
    st.assigned_reviewer_id === user.id ||
    st.samples?.orders?.assigned_analyst_id === user.id

  const rows = status === 'mine'
    ? scoped.filter(isMine)
    : status
      ? scoped.filter(st => stateOf(st) === TAB_STATE[status])
      : scoped

  const n = (s: WorkflowState) => scoped.filter(st => stateOf(st) === s).length
  const href = (tab: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== 'status') as [string, string][])
    if (tab) p.set('status', tab)
    const qs = p.toString()
    return `/admin/work-queue${qs ? `?${qs}` : ''}`
  }

  const tabs = [
    { key: '',         label: 'All',          href: href(''),         count: scoped.length,     active: !status },
    { key: 'mine',     label: 'My work',      href: href('mine'),     count: scoped.filter(isMine).length, active: status === 'mine' },
    { key: 'pending',  label: 'Pending',      href: href('pending'),  count: n('awaiting_entry'),  active: status === 'pending' },
    { key: 'entered',  label: 'In progress',  href: href('entered'),  count: n('awaiting_review'), active: status === 'entered' },
    { key: 'returned', label: 'Returned',     href: href('returned'), count: n('returned'),        active: status === 'returned' },
    { key: 'reviewed', label: 'Review',       href: href('reviewed'), count: n('in_review'),       active: status === 'reviewed' },
    { key: 'approved', label: 'Approved',     href: href('approved'), count: n('approved'),        active: status === 'approved' },
    { key: 'released', label: 'Released',     href: href('released'), count: n('released'),        active: status === 'released' },
  ]

  const actionable = n('awaiting_entry') + n('returned') + n('awaiting_review')
  const hasFilters = !!(analyst || reviewer || category || priority || due || q)

  return (
    <Page wide>
      <PageHeader
        title="Work Queue"
        description="Laboratory work requiring action"
        meta={
          actionable === 0
            ? 'Nothing is currently waiting on the bench.'
            : <>{actionable} item{actionable === 1 ? '' : 's'} requiring attention · {n('in_review')} with reviewers</>
        }
        actions={<ButtonLink href="/admin/review-queue"><ClipboardCheck className="h-3.5 w-3.5" /> Review Queue</ButtonLink>}
      />

      <div className="mb-3">
        <Tabs items={tabs} />
      </div>

      <FilterBar
        hidden={{ status }}
        clearHref={`/admin/work-queue${status ? `?status=${status}` : ''}`}
        active={hasFilters}
        count={rows.length}
      >
        <SearchField defaultValue={q} placeholder="Search order, sample, test or client…" />

        <Select name="priority" defaultValue={priority ?? ''} aria-label="Priority">
          <option value="">All priorities</option>
          <option value="same_day">STAT (same day)</option>
          <option value="priority_24h">24 hour</option>
          <option value="priority_48h">48 hour</option>
          <option value="normal">Normal</option>
        </Select>

        <Select name="category" defaultValue={category ?? ''} aria-label="Category">
          <option value="">All categories</option>
          <option value="chemistry">Chemistry</option>
          <option value="microbiology">Microbiology</option>
        </Select>

        <Select name="analyst" defaultValue={analyst ?? ''} aria-label="Analyst">
          <option value="">All analysts</option>
          {staff?.map(a => (
            <option key={a.id} value={a.id}>
              {[a.first_name, a.last_name].filter(Boolean).join(' ') || a.email}
            </option>
          ))}
        </Select>

        <Select name="reviewer" defaultValue={reviewer ?? ''} aria-label="Reviewer">
          <option value="">All reviewers</option>
          <option value="me">Assigned to me</option>
          <option value="none">Unassigned</option>
          {reviewerProfiles?.map(r => (
            <option key={r.id} value={r.id}>
              {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email}
            </option>
          ))}
        </Select>

        <Select name="due" defaultValue={due ?? ''} aria-label="Due date">
          <option value="">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="week">Due within 7 days</option>
        </Select>
      </FilterBar>

      <WorkQueueTable rows={rows as any} reviewers={reviewerProfiles ?? []} />
    </Page>
  )
}
