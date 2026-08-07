import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, TestTube, Pencil } from 'lucide-react'
import TestToggle from '@/components/tests/TestToggle'

interface SearchParams { category?: string; search?: string; status?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function TestsPage({ searchParams }: Props) {
  const { category, search, status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tests')
    .select('id, name, code, category, method, unit, turnaround_days, is_active')
    .order('category')
    .order('name')

  if (category) query = query.eq('category', category)
  if (status === 'active') query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)
  if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,method.ilike.%${search}%`)

  const { data: tests } = await query

  const chemistry     = tests?.filter(t => t.category === 'chemistry') ?? []
  const microbiology  = tests?.filter(t => t.category === 'microbiology') ?? []
  const other         = tests?.filter(t => t.category !== 'chemistry' && t.category !== 'microbiology') ?? []

  const totalActive   = tests?.filter(t => t.is_active).length ?? 0
  const totalInactive = tests?.filter(t => !t.is_active).length ?? 0

  const categoryGroups = [
    { label: 'Chemistry',     items: chemistry,    color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'Microbiology',  items: microbiology, color: 'bg-green-50 text-green-700 border-green-100' },
    ...(other.length > 0 ? [{ label: 'Other', items: other, color: 'bg-slate-50 text-slate-700 border-slate-100' }] : []),
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tests Catalog</h1>
          <p className="text-slate-500 text-sm mt-1">
            {tests?.length ?? 0} tests · {totalActive} active · {totalInactive} inactive
          </p>
        </div>
        <Link href="/admin/tests/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm">
          <Plus className="w-4 h-4" /> Add Test
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3">
        <form className="flex flex-wrap gap-3 w-full">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search name, code, method…"
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-48"
          />
          <select name="category" defaultValue={category ?? ''}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All categories</option>
            <option value="chemistry">Chemistry</option>
            <option value="microbiology">Microbiology</option>
          </select>
          <select name="status" defaultValue={status ?? ''}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <button type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition">
            Filter
          </button>
          {(search || category || status) && (
            <Link href="/admin/tests"
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Tables by category */}
      <div className="space-y-6">
        {categoryGroups.map(({ label, items, color }) => (
          items.length === 0 ? null : (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <TestTube className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-900">{label}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${color}`}>
                  {items.length} tests
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">TAT (days)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((test) => (
                      <tr key={test.id} className={`hover:bg-slate-50 transition ${!test.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{test.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{test.code ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{test.method ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{test.unit ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 text-center">{test.turnaround_days ?? '—'}</td>
                        <td className="px-4 py-3">
                          <TestToggle id={test.id} isActive={test.is_active} />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/tests/${test.id}`}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition inline-flex">
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ))}

        {tests?.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <TestTube className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No tests found</p>
            <Link href="/admin/tests/new" className="mt-3 inline-block text-blue-600 text-sm hover:underline">
              Add your first test
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
