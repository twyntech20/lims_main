import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FlaskConical } from 'lucide-react'
import WorkQueueTable from '@/components/work-queue/WorkQueueTable'
import { RESULT_QUEUE_SELECT, REVIEWER_SELECT } from '@/lib/queries/result-queue'
import { workflowState, type WorkflowState } from '@/lib/workflow'

interface SearchParams { status?: string; category?: string }
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
  const { status, category } = await searchParams
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

  // Show only tests for orders assigned to this analyst, OR tests they
  // entered themselves — approved results stay visible so Analyst 1 sees
  // the outcome of their own submissions, not just the open work.
  const mine = ((sampleTests ?? []) as any[]).filter(st =>
    st.samples?.orders?.assigned_analyst_id === user.id ||
    st.entered_by_profile?.id === user.id
  )

  const stateOf = (st: any): WorkflowState => workflowState({
    status: st.status,
    returned_at: st.returned_at,
    assigned_reviewer_id: st.assigned_reviewer_id,
    order_released_at: st.samples?.orders?.released_at,
  })

  const filtered = status ? mine.filter(st => stateOf(st) === TAB_STATE[status]) : mine
  const countState = (s: WorkflowState) => mine.filter(st => stateOf(st) === s).length

  const tabs = [
    { key: '',         label: 'All',              count: mine.length },
    { key: 'pending',  label: 'Awaiting entry',   count: countState('awaiting_entry') },
    { key: 'returned', label: 'Returned to me',   count: countState('returned') },
    { key: 'entered',  label: 'Awaiting review',  count: countState('awaiting_review') },
    { key: 'reviewed', label: 'In review',        count: countState('in_review') },
    { key: 'approved', label: 'Ready to release', count: countState('approved') },
    { key: 'released', label: 'Released',         count: countState('released') },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-blue-600" />
          My Work Queue
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {countState('awaiting_entry')} to enter · {countState('returned')} returned to you ·{' '}
          {countState('awaiting_review')} to assign · {countState('in_review')} with a reviewer
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map(tab => {
          const active = (status ?? '') === tab.key
          return (
            <a key={tab.key}
              href={`/analyst/work-queue${tab.key ? `?status=${tab.key}` : ''}`}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>{tab.count}</span>
            </a>
          )
        })}
      </div>

      {/* Category filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <form className="flex flex-wrap gap-3">
          {status && <input type="hidden" name="status" value={status} />}
          <select name="category" defaultValue={category ?? ''}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All categories</option>
            <option value="chemistry">Chemistry</option>
            <option value="microbiology">Microbiology</option>
          </select>
          <button type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition">
            Filter
          </button>
          {category && (
            <a href={`/analyst/work-queue${status ? `?status=${status}` : ''}`}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">
              Clear
            </a>
          )}
        </form>
      </div>

      <WorkQueueTable rows={filtered as any} orderBasePath="/analyst/orders" reviewers={reviewerProfiles ?? []} />
    </div>
  )
}
