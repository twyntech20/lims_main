import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Calendar, AlertTriangle, FileText, Pencil } from 'lucide-react'
import { formatDate, formatDateTime, getOrderStatusColor, getPriorityColor, getPriorityLabel } from '@/lib/utils'
import AssignAnalystForm from '@/components/orders/AssignAnalystForm'
import UpdateStatusForm from '@/components/orders/UpdateStatusForm'
import AddSampleForm from '@/components/orders/AddSampleForm'
import SubmitToClientPanel from '@/components/orders/SubmitToClientPanel'
import { personName, workflowState, WORKFLOW_LABEL } from '@/lib/workflow'

const STATUS_LABELS: Record<string, string> = {
  new: 'New', submitted: 'Submitted', in_progress: 'In Progress',
  review: 'In Review', completed: 'Completed', cancelled: 'Cancelled',
}

interface Props { params: Promise<{ id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [orderRes, analystsRes, testsRes] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        *,
        clients(id, client_name, email, phone),
        profiles!orders_assigned_analyst_id_fkey(id, first_name, last_name, email),
        released_by_profile:profiles!orders_released_by_fkey(id, first_name, last_name, email),
        samples(
          id, sample_id, description, matrix_type, collection_date, collection_location, status,
          sample_tests(
            id, status, result, unit, qualifier, returned_at, assigned_reviewer_id, approved_at,
            tests(id, name, code, category),
            approved_by_profile:profiles!sample_tests_approved_by_fkey(first_name, last_name, email)
          )
        )
      `)
      .eq('id', id)
      .single(),
    supabase.from('profiles').select('id, first_name, last_name, email').eq('role', 'analyst').order('first_name'),
    supabase.from('tests').select('id, name, code, category').eq('is_active', true).order('category').order('name'),
  ])

  if (orderRes.error || !orderRes.data) notFound()
  const order = orderRes.data as any
  const analysts = analystsRes.data ?? []
  const tests = testsRes.data ?? []

  const isOverdue = order.date_due && new Date(order.date_due) < new Date() && !['completed', 'cancelled'].includes(order.status)

  // Release readiness, computed from the results themselves.
  const allSampleTests = (order.samples ?? []).flatMap((s: any) => s.sample_tests ?? [])
  const notApproved    = allSampleTests.filter((st: any) => st.status !== 'approved')
  const readyToRelease = allSampleTests.length > 0 && notApproved.length === 0
  const isReleased     = !!order.released_at

  const approvedRows = allSampleTests
    .filter((st: any) => st.status === 'approved')
    .map((st: any) => ({
      id: st.id,
      testName: st.tests?.name ?? '—',
      result: st.result,
      unit: st.unit,
      qualifier: st.qualifier,
      sampleId: (order.samples ?? []).find((s: any) => s.sample_tests?.some((t: any) => t.id === st.id))?.sample_id ?? '—',
      reviewerName: personName(st.approved_by_profile),
      approvedAt: st.approved_at,
    }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="text-slate-400 hover:text-slate-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{order.order_number}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                {STATUS_LABELS[order.status]}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                {getPriorityLabel(order.priority)}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1">
              {order.clients?.client_name} · Created {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/orders/${order.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition"
          >
            <Pencil className="w-4 h-4" />
            Edit Order
          </Link>
          <Link
            href={`/admin/orders/${order.id}/coc`}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition"
          >
            <FileText className="w-4 h-4" />
            Print COC
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: main info */}
        <div className="col-span-2 space-y-5">
          {/* Client info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Client Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-0.5">Company</p>
                <p className="font-medium text-slate-900">{order.clients?.client_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Contact</p>
                <p className="font-medium text-slate-900">{order.customer_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Email</p>
                <p className="font-medium text-slate-900">{order.customer_email ?? order.clients?.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Phone</p>
                <p className="font-medium text-slate-900">{order.customer_phone ?? order.clients?.phone ?? '—'}</p>
              </div>
              {order.shipping_address && (
                <div className="col-span-2">
                  <p className="text-slate-500 mb-0.5">Address</p>
                  <p className="font-medium text-slate-900">{order.shipping_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Samples */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">
              Samples
              <span className="ml-2 text-xs font-normal text-slate-500">({order.samples?.length ?? 0})</span>
            </h2>

            {(order.samples ?? []).length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No samples added yet</p>
            ) : (
              <div className="space-y-3 mb-5">
                {order.samples.map((sample: any) => (
                  <div key={sample.id} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">{sample.sample_id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        sample.status === 'completed' ? 'bg-green-100 text-green-700' :
                        sample.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{sample.status}</span>
                    </div>
                    <div className="text-sm text-slate-500 space-y-0.5">
                      {sample.matrix_type && <p>Matrix: {sample.matrix_type}</p>}
                      {sample.collection_date && <p>Collected: {formatDate(sample.collection_date)}</p>}
                      {sample.description && <p>{sample.description}</p>}
                    </div>
                    {sample.sample_tests?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {sample.sample_tests.map((st: any) => {
                          const state = workflowState({
                            status: st.status,
                            returned_at: st.returned_at,
                            assigned_reviewer_id: st.assigned_reviewer_id,
                            order_released_at: order.released_at,
                          })
                          return (
                            <span key={st.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {st.tests?.name ?? '—'}
                              <span className="text-blue-400 ml-1">· {WORKFLOW_LABEL[state]}</span>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add sample form */}
            {!['completed', 'cancelled'].includes(order.status) && (
              <AddSampleForm orderId={order.id} tests={tests} />
            )}
          </div>

          {/* Notes / COC Metadata */}
          {order.notes && (() => {
            let coc: Record<string, string> = {}
            try { coc = JSON.parse(order.notes) } catch { return null }
            const entries = Object.entries(coc).filter(([, v]) => v !== null && v !== '' && v !== 'null')
            if (entries.length === 0) return null
            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h2 className="font-semibold text-slate-900 mb-3">COC Metadata</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {entries.map(([k, v]) => (
                    <div key={k}>
                      <span className="text-slate-500">{k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}:</span>
                      <span className="ml-1 font-medium text-slate-900">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Right: actions */}
        <div className="space-y-4">
          {/* Dates */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Timeline</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Received', value: order.date_received, icon: Calendar },
                { label: 'Due', value: order.date_due, icon: Calendar, overdue: isOverdue },
                { label: 'Assigned', value: order.date_assigned, icon: User },
                { label: 'Completed', value: order.date_completed, icon: Calendar },
              ].map(({ label, value, icon: Icon, overdue }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-medium ${overdue ? 'text-red-600' : 'text-slate-900'}`}>
                    {value ? formatDate(value) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Controlled release to the client */}
          {isReleased ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-green-600" />
                <h2 className="font-semibold text-green-900">Released to client</h2>
              </div>
              <div className="text-sm text-green-800 space-y-1">
                <p>Released by <span className="font-medium">{personName(order.released_by_profile)}</span></p>
                <p>{formatDateTime(order.released_at)}</p>
              </div>
              <Link href={`/admin/reports/${order.id}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs bg-white border border-green-300 text-green-800 px-3 py-1.5 rounded-lg font-medium hover:bg-green-100 transition">
                <FileText className="w-3 h-3" /> View approved report
              </Link>
            </div>
          ) : readyToRelease ? (
            <SubmitToClientPanel
              orderId={order.id}
              orderNumber={order.order_number}
              clientName={order.clients?.client_name ?? order.customer_name ?? '—'}
              rows={approvedRows}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-semibold text-slate-900 mb-1">Release to Client</h2>
              <p className="text-sm text-slate-500">
                {allSampleTests.length === 0
                  ? 'This order has no tests yet.'
                  : `Blocked — ${notApproved.length} of ${allSampleTests.length} result(s) still need to be entered, reviewed or approved.`}
              </p>
            </div>
          )}

          {/* Status update */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Update Status</h2>
            <UpdateStatusForm orderId={order.id} currentStatus={order.status} />
          </div>

          {/* Assign analyst */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Assigned Analyst</h2>
            <AssignAnalystForm
              orderId={order.id}
              currentAnalystId={order.assigned_analyst_id}
              analysts={analysts}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
