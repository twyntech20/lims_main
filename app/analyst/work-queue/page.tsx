import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FlaskConical } from 'lucide-react'
import WorkQueueTable from '@/components/work-queue/WorkQueueTable'

interface SearchParams { status?: string; category?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function AnalystWorkQueuePage({ searchParams }: Props) {
  const { status, category } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Reviewers available to assign to — matches the authorization check in
  // submitSampleForReview (analyst with can_review, or admin/manager).
  const { data: reviewerProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .or('can_review.eq.true,role.in.(admin,manager)')
    .eq('is_active', true)
    .neq('id', user.id)
    .order('first_name')

  // Analyst sees: tests pending entry, or tests they entered that haven't been approved yet
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
          assigned_analyst_id,
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
      entered_by_profile:profiles!sample_tests_entered_by_fkey ( first_name, last_name, email )
    `)
    .order('entered_at', { ascending: true, nullsFirst: true })

  if (status)   query = query.eq('status', status)
  if (category) query = query.eq('tests.category', category)

  const { data: sampleTests } = await query

  // Filter: show only tests for orders assigned to this analyst, OR tests entered by this analyst
  // (approved results stay visible here too — Analyst 1 needs to see the outcome of
  // their own submissions once Analyst 2 has reviewed them, not just the open work).
  const filtered = (sampleTests ?? []).filter(st => {
    const order = (st.samples as any)?.orders
    return order?.assigned_analyst_id === user.id || (st as any).entered_by_profile?.id === user.id
  })

  const pendingCount  = filtered.filter(s => s.status === 'pending').length
  const enteredCount  = filtered.filter(s => s.status === 'entered').length
  const reviewedCount = filtered.filter(s => s.status === 'reviewed').length
  const approvedCount = filtered.filter(s => s.status === 'approved').length

  const tabs = [
    { key: '',         label: 'All',      count: filtered.length },
    { key: 'pending',  label: 'Pending',  count: pendingCount },
    { key: 'entered',  label: 'Entered',  count: enteredCount },
    { key: 'reviewed', label: 'In Review', count: reviewedCount },
    { key: 'approved', label: 'Approved', count: approvedCount },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-blue-600" />
          My Work Queue
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {pendingCount} pending entry · {enteredCount} awaiting review
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1 w-fit">
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
