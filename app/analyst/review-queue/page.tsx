import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import ReviewQueueTable from '@/components/work-queue/ReviewQueueTable'

interface SearchParams { category?: string; priority?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function AnalystReviewQueuePage({ searchParams }: Props) {
  const { category, priority } = await searchParams
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
    .select(`
      id,
      status,
      result,
      unit,
      qualifier,
      mdl,
      dilution_factor,
      analyst_notes,
      entered_at,
      reviewed_at,
      samples (
        id,
        sample_id,
        description,
        matrix_type,
        collection_date,
        orders (
          id,
          priority,
          date_due,
          customer_name,
          clients ( client_name )
        )
      ),
      tests (
        id,
        name,
        code,
        category,
        unit
      ),
      entered_by_profile:profiles!sample_tests_entered_by_fkey ( first_name, last_name, email ),
      reviewed_by_profile:profiles!sample_tests_reviewed_by_fkey ( first_name, last_name, email )
    `)
    // Only results explicitly assigned to this reviewer — "entered" items
    // haven't been assigned by Analyst 1 yet, so they don't belong here.
    .eq('status', 'reviewed')
    .eq('assigned_reviewer_id', user.id)
    .order('entered_at', { ascending: true })

  if (category) query = query.eq('tests.category', category)

  const { data: sampleTests } = await query

  const filtered = (sampleTests ?? []).filter(st => {
    if (priority) {
      const order = (st.samples as any)?.orders
      if (order?.priority !== priority) return false
    }
    return true
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-purple-600" />
          Review Queue
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} assigned to you for review
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <form className="flex flex-wrap gap-3">
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
        </form>
      </div>

      <ReviewQueueTable rows={filtered as any} orderBasePath="/analyst/orders" />
    </div>
  )
}
