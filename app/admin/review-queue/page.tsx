import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardCheck, FlaskConical } from 'lucide-react'
import ReviewQueueTable from '@/components/work-queue/ReviewQueueTable'
import { RESULT_QUEUE_SELECT } from '@/lib/queries/result-queue'
import { isOverdue } from '@/lib/workflow'

interface SearchParams { category?: string; priority?: string; reviewer?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function ReviewQueuePage({ searchParams }: Props) {
  const { category, priority, reviewer } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reviewerProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .or('can_review.eq.true,role.in.(admin,manager)')
    .eq('is_active', true)
    .order('first_name')

  let query = supabase
    .from('sample_tests')
    .select(RESULT_QUEUE_SELECT)
    .in('status', ['entered', 'reviewed'])
    .order('entered_at', { ascending: true })

  if (category) query = query.eq('tests.category', category)

  const { data: sampleTests } = await query

  const filtered = ((sampleTests ?? []) as any[]).filter(st => {
    if (priority && st.samples?.orders?.priority !== priority) return false
    if (reviewer === 'me'   && st.assigned_reviewer_id !== user.id) return false
    if (reviewer === 'none' && st.assigned_reviewer_id) return false
    if (reviewer && reviewer !== 'me' && reviewer !== 'none' && st.assigned_reviewer_id !== reviewer) return false
    return true
  })

  const inReviewCount   = filtered.filter(s => s.status === 'reviewed').length
  const unassignedCount = filtered.filter(s => s.status === 'entered').length
  const overdueCount    = filtered.filter(s => s.status === 'reviewed' && isOverdue(s.samples?.orders?.date_due)).length
  const mineCount       = filtered.filter(s => s.assigned_reviewer_id === user.id).length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-600" />
            Review Queue
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {inReviewCount} awaiting a review decision · {mineCount} assigned to you ·{' '}
            {unassignedCount} not yet assigned to a reviewer
            {overdueCount > 0 && <span className="text-red-600 font-medium"> · {overdueCount} overdue</span>}
          </p>
        </div>
        <Link href="/admin/work-queue"
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm">
          <FlaskConical className="w-4 h-4" /> Work Queue
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <form className="flex flex-wrap gap-3">
          <select name="reviewer" defaultValue={reviewer ?? ''}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All reviewers</option>
            <option value="me">Assigned to me</option>
            <option value="none">Not yet assigned</option>
            {reviewerProfiles?.map(r => (
              <option key={r.id} value={r.id}>
                {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={category ?? ''}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All categories</option>
            <option value="chemistry">Chemistry</option>
            <option value="microbiology">Microbiology</option>
          </select>
          <select name="priority" defaultValue={priority ?? ''}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All priorities</option>
            <option value="normal">Normal</option>
            <option value="priority_24h">Priority 24h</option>
            <option value="priority_48h">Priority 48h</option>
            <option value="same_day">Same Day</option>
          </select>
          <button type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition">
            Filter
          </button>
          {(category || priority || reviewer) && (
            <Link href="/admin/review-queue"
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">
              Clear
            </Link>
          )}
        </form>
      </div>

      <ReviewQueueTable rows={filtered as any} />
    </div>
  )
}
