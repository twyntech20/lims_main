import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { resolvePortalClientId, canPortalUserViewOrder } from '@/lib/queries/client-portal'
import Link from 'next/link'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import { formatDate, formatDateTime, getOrderStatusColor, getPriorityLabel, getPriorityColor } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  new: 'Draft', submitted: 'Submitted — Under Review', in_progress: 'In Progress',
  review: 'Final Review', completed: 'Completed', cancelled: 'Cancelled',
}

const RESULT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: 'text-slate-400' },
  entered:  { label: 'Entered',  color: 'text-blue-600' },
  reviewed: { label: 'Reviewed', color: 'text-purple-600' },
  approved: { label: 'Approved', color: 'text-green-600' },
}

interface Props { params: Promise<{ id: string }> }

export default async function ClientOrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) notFound()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      clients(id, client_name, email, phone),
      samples(
        id, sample_id, description, matrix_type, collection_date, status,
        sample_tests(
          id, status, result, unit, qualifier,
          tests(id, name, code)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !order) notFound()

  const o = order as any

  // Ownership is the client this order belongs to — the same rule the order
  // list uses. Authorising on created_by alone hid every order the lab raised
  // on the client's behalf: it appeared in the list and then 404'd on open.
  const clientId = await resolvePortalClientId(supabase, user.id)
  if (!canPortalUserViewOrder(o, clientId, user.id)) notFound()

  const completedTests = o.samples?.flatMap((s: any) =>
    s.sample_tests?.filter((st: any) => st.status === 'approved')
  ).length ?? 0
  const totalTests = o.samples?.flatMap((s: any) => s.sample_tests ?? []).length ?? 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/client/orders" className="text-slate-400 hover:text-slate-600 mt-1 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{o.order_number}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(o.status)}`}>
              {STATUS_LABELS[o.status] ?? o.status}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(o.priority)}`}>
              {getPriorityLabel(o.priority)}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Submitted {formatDateTime(o.created_at)}</p>
        </div>
      </div>

      {/* Progress bar */}
      {totalTests > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Analysis Progress</span>
            <span className="text-sm text-slate-500">{completedTests} / {totalTests} tests approved</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${totalTests > 0 ? (completedTests / totalTests) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Samples & Results */}
        <div className="col-span-2 space-y-4">
          {(o.samples ?? []).map((sample: any) => (
            <div key={sample.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-900">{sample.sample_id}</span>
                  {sample.matrix_type && <span className="text-xs text-slate-500">· {sample.matrix_type}</span>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  sample.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>{sample.status}</span>
              </div>

              {/* Tests & Results */}
              <div className="divide-y divide-slate-50">
                {(sample.sample_tests ?? []).map((st: any) => {
                  const statusCfg = RESULT_STATUS_LABELS[st.status] ?? RESULT_STATUS_LABELS.pending
                  // qualifier "ND" means not detected
                  const displayValue = st.qualifier === 'ND' ? 'ND' : st.result
                  const hasResult = displayValue !== null && displayValue !== undefined && displayValue !== ''
                  return (
                    <div key={st.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <span className="text-sm font-medium text-slate-800">{st.tests?.name ?? '—'}</span>
                        {st.tests?.code && <span className="text-xs text-slate-400 ml-2">{st.tests.code}</span>}
                      </div>
                      <div className="text-right">
                        {hasResult ? (
                          <div>
                            <span className="text-sm font-bold text-slate-900">{displayValue}</span>
                            {st.qualifier !== 'ND' && st.unit && (
                              <span className="text-xs text-slate-500 ml-1">{st.unit}</span>
                            )}
                            <p className={`text-xs ${statusCfg.color} mt-0.5`}>{statusCfg.label}</p>
                          </div>
                        ) : (
                          <span className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {(sample.sample_tests ?? []).length === 0 && (
                  <p className="text-xs text-slate-400 px-5 py-3">No tests assigned</p>
                )}
              </div>
            </div>
          ))}
          {(o.samples ?? []).length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center text-slate-400">
              No samples added yet
            </div>
          )}
        </div>

        {/* Order info sidebar */}
        <div className="min-w-0 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Timeline</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Submitted', value: o.date_received },
                { label: 'Due Date', value: o.date_due },
                { label: 'Completed', value: o.date_completed },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-900">{value ? formatDate(value) : '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {o.notes && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-semibold text-slate-900 mb-2">Notes</h2>
              <p className="max-h-96 overflow-y-auto break-words pr-1 text-sm text-slate-600 whitespace-pre-wrap">{o.notes}</p>
            </div>
          )}

          {o.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <p className="text-green-800 text-sm font-medium mb-1">Results Ready</p>
              <p className="text-green-600 text-xs">All analyses are complete. Results are shown above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
