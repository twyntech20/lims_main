import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FlaskConical, Filter } from 'lucide-react'
import ReviewQueueTable from '@/components/work-queue/ReviewQueueTable'
import { RESULT_QUEUE_SELECT } from '@/lib/queries/result-queue'
import { isOverdue } from '@/lib/workflow'
import {
  Page, PageHeader, Tabs, Toolbar, Select, SearchField, ButtonLink, buttonClass,
} from '@/components/ui/primitives'

interface SearchParams {
  category?: string; priority?: string; reviewer?: string
  analyst?: string; due?: string; q?: string; view?: string
}
interface Props { searchParams: Promise<SearchParams> }

export default async function ReviewQueuePage({ searchParams }: Props) {
  const sp = await searchParams
  const { category, priority, reviewer, analyst, due, q, view } = sp
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reviewerProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .or('can_review.eq.true,role.in.(admin,manager)')
    .eq('is_active', true)
    .order('first_name')

  const { data: analystProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('role', ['analyst', 'admin', 'manager'])
    .order('first_name')

  let query = supabase
    .from('sample_tests')
    .select(RESULT_QUEUE_SELECT)
    .in('status', ['entered', 'reviewed'])
    .order('entered_at', { ascending: true })

  if (category) query = query.eq('tests.category', category)

  const { data: sampleTests } = await query

  const scoped = ((sampleTests ?? []) as any[]).filter(st => {
    if (priority && st.samples?.orders?.priority !== priority) return false
    if (analyst && st.entered_by_profile?.id !== analyst) return false
    if (reviewer === 'me'   && st.assigned_reviewer_id !== user.id) return false
    if (reviewer === 'none' && st.assigned_reviewer_id) return false
    if (reviewer && !['me', 'none'].includes(reviewer) && st.assigned_reviewer_id !== reviewer) return false
    if (due === 'overdue' && !isOverdue(st.samples?.orders?.date_due)) return false
    if (q) {
      const hay = [st.samples?.orders?.order_number, st.samples?.sample_id, st.tests?.name, st.tests?.code]
        .filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  const inReview   = scoped.filter(s => s.status === 'reviewed')
  const unassigned = scoped.filter(s => s.status === 'entered')
  const mine       = scoped.filter(s => s.assigned_reviewer_id === user.id && s.status === 'reviewed')
  const overdue    = inReview.filter(s => isOverdue(s.samples?.orders?.date_due))

  const rows =
    view === 'mine'       ? mine :
    view === 'unassigned' ? unassigned :
    view === 'overdue'    ? overdue :
    scoped

  const href = (v: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([k, val]) => val && k !== 'view') as [string, string][])
    if (v) p.set('view', v)
    const qs = p.toString()
    return `/admin/review-queue${qs ? `?${qs}` : ''}`
  }

  const tabs = [
    { key: '',           label: 'All',           href: href(''),            count: scoped.length,     active: !view },
    { key: 'mine',       label: 'Assigned to me',href: href('mine'),        count: mine.length,       active: view === 'mine' },
    { key: 'unassigned', label: 'Unassigned',    href: href('unassigned'),  count: unassigned.length, active: view === 'unassigned' },
    { key: 'overdue',    label: 'Overdue',       href: href('overdue'),     count: overdue.length,    active: view === 'overdue' },
  ]

  const hasFilters = !!(category || priority || reviewer || analyst || due || q)

  return (
    <Page wide>
      <PageHeader
        title="Review Queue"
        meta={
          <>
            {inReview.length} result{inReview.length === 1 ? '' : 's'} awaiting a review decision
            {mine.length > 0 && <> · <span className="font-medium text-ink-2">{mine.length} assigned to you</span></>}
            {overdue.length > 0 && <> · <span className="font-medium text-crit-fg">{overdue.length} overdue</span></>}
          </>
        }
        actions={<ButtonLink href="/admin/work-queue"><FlaskConical className="h-3.5 w-3.5" /> Work Queue</ButtonLink>}
      />

      <div className="mb-3"><Tabs items={tabs} /></div>

      <form>
        {view && <input type="hidden" name="view" value={view} />}
        <Toolbar>
          <SearchField defaultValue={q} placeholder="Search order, sample or test…" />

          <Select name="reviewer" defaultValue={reviewer ?? ''} aria-label="Reviewer">
            <option value="">All reviewers</option>
            <option value="me">Assigned to me</option>
            <option value="none">Not yet assigned</option>
            {reviewerProfiles?.map(r => (
              <option key={r.id} value={r.id}>
                {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email}
              </option>
            ))}
          </Select>

          <Select name="analyst" defaultValue={analyst ?? ''} aria-label="Analyst">
            <option value="">All analysts</option>
            {analystProfiles?.map(a => (
              <option key={a.id} value={a.id}>
                {[a.first_name, a.last_name].filter(Boolean).join(' ') || a.email}
              </option>
            ))}
          </Select>

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
          {hasFilters && (
            <a href={`/admin/review-queue${view ? `?view=${view}` : ''}`}
              className="px-1.5 text-[12px] text-ink-3 underline-offset-2 hover:text-ink hover:underline">
              Clear
            </a>
          )}
          <span className="ml-auto text-[12px] text-ink-3 tabular">{rows.length} shown</span>
        </Toolbar>
      </form>

      <ReviewQueueTable rows={rows as any} />
    </Page>
  )
}
