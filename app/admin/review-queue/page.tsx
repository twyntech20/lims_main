import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClipboardCheck, FlaskConical } from 'lucide-react'
import ReviewQueueTable from '@/components/work-queue/ReviewQueueTable'

interface SearchParams { category?: string; priority?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function ReviewQueuePage({ searchParams }: Props) {
  const { category, priority } = await searchParams
  const supabase = await createClient()

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
    .in('status', ['entered', 'reviewed'])
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

  const enteredCount  = filtered.filter(s => s.status === 'entered').length
  const reviewedCount = filtered.filter(s => s.status === 'reviewed').length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-600" />
            Review Queue
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {enteredCount} awaiting review · {reviewedCount} reviewed
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
          {(category || priority) && (
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
