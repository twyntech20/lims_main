import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClipboardList, FlaskConical } from 'lucide-react'
import WorkQueueTable from '@/components/work-queue/WorkQueueTable'

interface SearchParams { status?: string; analyst?: string; category?: string; priority?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function WorkQueuePage({ searchParams }: Props) {
  const { status, analyst, category, priority } = await searchParams
  const supabase = await createClient()

  // Fetch analysts for filter dropdown
  const { data: analysts } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('role', ['analyst', 'admin', 'supervisor'])
    .order('first_name')

  // Base query: all sample_tests with their sample + order + test info
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

  // Filter by analyst after fetch (since it's a FK filter on entered_by)
  const filtered = sampleTests?.filter(st => {
    if (analyst && (st as any).entered_by_profile?.email !== analyst) return false
    if (priority) {
      const order = (st.samples as any)?.orders
      if (order?.priority !== priority) return false
    }
    return true
  }) ?? []

  // Status counts for tabs
  const allData = sampleTests ?? []
  const counts = {
    all:      allData.length,
    pending:  allData.filter(s => s.status === 'pending').length,
    entered:  allData.filter(s => s.status === 'entered').length,
    reviewed: allData.filter(s => s.status === 'reviewed').length,
    approved: allData.filter(s => s.status === 'approved').length,
  }

  const tabs = [
    { key: '',         label: 'All',      count: counts.all },
    { key: 'pending',  label: 'Pending',  count: counts.pending },
    { key: 'entered',  label: 'Entered',  count: counts.entered },
    { key: 'reviewed', label: 'Reviewed', count: counts.reviewed },
    { key: 'approved', label: 'Approved', count: counts.approved },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-blue-600" />
            Work Queue
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {counts.pending} pending · {counts.entered} entered · {counts.reviewed} in review
          </p>
        </div>
        <Link href="/admin/review-queue"
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm">
          <ClipboardList className="w-4 h-4" /> Review Queue
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map(tab => {
          const active = (status ?? '') === tab.key
          return (
            <Link key={tab.key}
              href={`/admin/work-queue${tab.key ? `?status=${tab.key}` : ''}`}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>{tab.count}</span>
            </Link>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <form className="flex flex-wrap gap-3">
          {status && <input type="hidden" name="status" value={status} />}
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
          <select name="analyst" defaultValue={analyst ?? ''}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All analysts</option>
            {analysts?.map(a => (
              <option key={a.id} value={a.email}>
                {[a.first_name, a.last_name].filter(Boolean).join(' ') || a.email}
              </option>
            ))}
          </select>
          <button type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition">
            Filter
          </button>
          {(category || priority || analyst) && (
            <Link href={`/admin/work-queue${status ? `?status=${status}` : ''}`}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">
              Clear filters
            </Link>
          )}
        </form>
      </div>

      {/* Main Table */}
      <WorkQueueTable rows={filtered as any} />
    </div>
  )
}
