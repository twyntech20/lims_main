import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { GitPullRequestArrow, Plus, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'
import AmendmentActions from '@/components/amendments/AmendmentActions'
import { personName } from '@/lib/workflow'
import { formatDateTime } from '@/lib/utils'

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

const VALUE_FIELDS = ['result', 'unit', 'qualifier', 'mdl', 'dilution_factor'] as const

// previous_value is a snapshot of the whole result taken at apply time;
// new_value only holds the fields the requester actually changed.
function valueDiff(previous: Record<string, any> | null, next: Record<string, any> | null) {
  if (!next) return []
  return VALUE_FIELDS
    .filter(f => next[f] !== undefined && next[f] !== null)
    .map(f => ({ field: f, from: previous?.[f] ?? null, to: next[f] }))
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
      reviewed_at,
      review_comment,
      applied_at,
      sample_test_id,
      previous_value,
      new_value,
      orders ( id, order_number ),
      sample_tests ( id, status, tests ( name ), samples ( sample_id ) ),
      requested_by_profile:profiles!amendments_requested_by_fkey ( first_name, last_name, email ),
      reviewed_by_profile:profiles!amendments_reviewed_by_fkey ( first_name, last_name, email )
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: amendments } = await query
  const rows = (amendments ?? []) as any[]
  const pendingCount = rows.filter(a => a.status === 'pending').length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Amendments</h1>
          <p className="text-slate-500 text-sm mt-1">
            {rows.length} total · {pendingCount} pending review
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
        {!rows.length ? (
          <div className="p-16 text-center">
            <GitPullRequestArrow className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No amendments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Change</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Requested by</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Decision</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((a) => {
                  const Icon = STATUS_ICON[a.status] ?? Clock
                  const order = (Array.isArray(a.orders) ? a.orders[0] : a.orders) as { id: string; order_number: string } | null
                  const st = (Array.isArray(a.sample_tests) ? a.sample_tests[0] : a.sample_tests) as any
                  const targetLabel = st
                    ? `${st.samples?.sample_id ?? '—'} · ${st.tests?.name ?? 'test'}`
                    : null
                  const diff = valueDiff(a.previous_value, a.new_value)

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition align-top">
                      <td className="px-6 py-3 text-sm font-mono font-medium text-slate-900">
                        {order?.order_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {targetLabel ?? <span className="text-slate-400">Order-level</span>}
                        {a.applied_at && (
                          <div className="text-[11px] text-green-600 mt-0.5">
                            Applied {formatDateTime(a.applied_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {a.reason}
                        <div className="text-xs text-slate-400 max-w-xs truncate" title={a.description}>
                          {a.description}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {diff.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {diff.map(d => (
                              <div key={d.field} className="flex items-center gap-1 font-mono">
                                <span className="text-slate-400">{d.field}:</span>
                                <span className="text-red-600 line-through">{d.from ?? '—'}</span>
                                <ArrowRight className="w-3 h-3 text-slate-300" />
                                <span className="text-green-700 font-semibold">{String(d.to)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {personName(a.requested_by_profile)}
                        <div className="text-[11px] text-slate-400">{new Date(a.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">
                        {a.reviewed_at ? (
                          <>
                            <div className="text-slate-700">{personName(a.reviewed_by_profile)}</div>
                            <div className="text-[11px] text-slate-400">{formatDateTime(a.reviewed_at)}</div>
                            {a.review_comment && <div className="italic mt-0.5">{a.review_comment}</div>}
                          </>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border ${STATUS_BADGE[a.status] ?? ''}`}>
                          <Icon className="w-3 h-3" />
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {a.status === 'pending' && (
                          <AmendmentActions
                            id={a.id}
                            appliesToResult={!!a.sample_test_id && !!a.new_value}
                            targetLabel={targetLabel}
                          />
                        )}
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
