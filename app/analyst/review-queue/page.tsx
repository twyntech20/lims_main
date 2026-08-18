import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReviewQueueTable from '@/components/work-queue/ReviewQueueTable'
import { RESULT_QUEUE_SELECT } from '@/lib/queries/result-queue'
import { isOverdue } from '@/lib/workflow'
import { Page, PageHeader, FilterBar, Select, SearchField } from '@/components/ui/primitives'

interface SearchParams { category?: string; priority?: string; due?: string; q?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function AnalystReviewQueuePage({ searchParams }: Props) {
  const { category, priority, due, q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Segregation of duties: only reviewers may open the Review Queue at all —
  // this mirrors the server-side check in approveSampleTest/rejectToAnalyst
  // so an analyst without review rights can't even see what's pending.
  const { data: profile } = await supabase.from('profiles').select('can_review').eq('id', user.id).single()
  if (!profile?.can_review) redirect('/analyst/dashboard')

  let query = supabase
    .from('sample_tests')
    .select(RESULT_QUEUE_SELECT)
    // Only results explicitly assigned to this reviewer — "entered" items
    // haven't been assigned by Analyst 1 yet, so they don't belong here.
    .eq('status', 'reviewed')
    .eq('assigned_reviewer_id', user.id)
    .order('entered_at', { ascending: true })

  if (category) query = query.eq('tests.category', category)

  const { data: sampleTests } = await query

  const rows = ((sampleTests ?? []) as any[]).filter(st => {
    if (priority && st.samples?.orders?.priority !== priority) return false
    if (due === 'overdue' && !isOverdue(st.samples?.orders?.date_due)) return false
    if (q) {
      const hay = [st.samples?.orders?.order_number, st.samples?.sample_id, st.tests?.name, st.tests?.code]
        .filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  const overdueCount = rows.filter(st => isOverdue(st.samples?.orders?.date_due)).length

  return (
    <Page wide>
      <PageHeader
        title="Review Queue"
        description="Results assigned to you for a review decision"
        meta={
          <>
            {rows.length} result{rows.length === 1 ? '' : 's'} awaiting your review
            {overdueCount > 0 && <> · <span className="font-medium text-crit-fg">{overdueCount} past the order due date</span></>}
          </>
        }
      />

      <FilterBar
        clearHref="/analyst/review-queue"
        active={!!(category || priority || due || q)}
        count={rows.length}
      >
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
      </FilterBar>

      <ReviewQueueTable rows={rows as any} orderBasePath="/analyst/orders" />
    </Page>
  )
}
