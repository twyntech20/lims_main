import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { GitPullRequestArrow, Plus, CheckCircle, XCircle, Clock } from 'lucide-react'
import AmendmentActions from '@/components/amendments/AmendmentActions'

interface SearchParams { status?: string }
interface Props { searchParams: Promise<SearchParams> }

const STATUS_TABS = [
  { label: 'All',      value: '' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_ICON: Record<string, React.ElementType> = {
  pending:  Clock,
  approved: CheckCircle,
  rejected: XCircle,
}

export default async function AmendmentsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('amendments')
    .select(`
      id,
      reason,
      description,
      status,
      created_at,
      orders (
        id,
        order_number
      ),
      profiles!amendments_requested_by_fkey (
        first_name,
        last_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: amendments } = await query

  const pendingCount  = amendments?.filter(a => a.status === 'pending').length ?? 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Amendments</h1>
          <p className="text-slate-500 text-sm mt-1">
            {amendments?.length ?? 0} total · {pendingCount} pending review
          </p>
        </div>
        <Link
          href="/admin/amendments/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" /> Request Amendment
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
        <div className="flex border-b border-slate-100">
          {STATUS_TABS.map(tab => (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/amendments?status=${tab.value}` : '/admin/amendments'}
              className={`px-5 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                (status ?? '') === tab.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {!amendments?.length ? (
          <div className="p-16 text-center">
            <GitPullRequestArrow className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No amendments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Requested By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {amendments.map((a) => {
                  const Icon = STATUS_ICON[a.status] ?? Clock
                  const profile = a.profiles as { first_name?: string; last_name?: string; email?: string } | null
                  const order = (Array.isArray(a.orders) ? a.orders[0] : a.orders) as { id: string; order_number: string } | null
                  const requesterName = profile
                    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || '—'
                    : '—'
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3 text-sm font-mono font-medium text-slate-900">
                        {order?.order_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{a.reason}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate" title={a.description}>
                        {a.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{requesterName}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border ${STATUS_BADGE[a.status] ?? ''}`}>
                          <Icon className="w-3 h-3" />
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {a.status === 'pending' && <AmendmentActions id={a.id} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
