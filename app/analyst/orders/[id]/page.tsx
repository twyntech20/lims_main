import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, FileText, User } from 'lucide-react'
import { formatDate, formatDateTime, getOrderStatusColor, getPriorityColor, getPriorityLabel } from '@/lib/utils'
import SubmitToClientPanel from '@/components/orders/SubmitToClientPanel'
import { personName } from '@/lib/workflow'

const STATUS_LABELS: Record<string, string> = {
  new: 'New', submitted: 'Submitted', in_progress: 'In Progress',
  review: 'In Review', completed: 'Submitted to Client', cancelled: 'Cancelled',
}

const RESULT_STATUS_BADGE: Record<string, string> = {
  pending:  'bg-slate-100 text-slate-600',
  entered:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
  reviewed: 'bg-blue-50 text-blue-700 border border-blue-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
}

interface Props { params: Promise<{ id: string }> }

export default async function AnalystOrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      clients(id, client_name, email, phone),
      released_by_profile:profiles!orders_released_by_fkey(first_name, last_name, email),
      samples(
        id, sample_id, description, matrix_type, collection_date, status,
        sample_tests(
          id, status, result, unit, qualifier, mdl, analyst_notes, approved_at,
          tests(id, name, code, category),
          approved_by_profile:profiles!sample_tests_approved_by_fkey ( first_name, last_name, email )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()
  // This is a personal work view — analysts see only orders assigned to them.
  if ((order as any).assigned_analyst_id !== user.id) redirect('/analyst/work-queue')

  const samples = (order as any).samples ?? []
  const allSampleTests = samples.flatMap((s: any) => s.sample_tests ?? [])
  const allApproved = allSampleTests.length > 0 && allSampleTests.every((st: any) => st.status === 'approved')
  const hasAnyApproved = allSampleTests.some((st: any) => st.status === 'approved')
  const isOverdue = order.date_due && new Date(order.date_due) < new Date() && order.status !== 'completed'
  const isReleased = !!(order as any).released_at

  const approvedRows = allSampleTests
    .filter((st: any) => st.status === 'approved')
    .map((st: any) => {
      const sample = samples.find((s: any) => s.sample_tests?.some((t: any) => t.id === st.id))
      const reviewer = st.approved_by_profile
      return {
        id: st.id,
        testName: st.tests?.name ?? '—',
        result: st.result,
        unit: st.unit,
        qualifier: st.qualifier,
        sampleId: sample?.sample_id ?? '—',
        reviewerName: reviewer ? ([reviewer.first_name, reviewer.last_name].filter(Boolean).join(' ') || reviewer.email) : '—',
        approvedAt: st.approved_at,
      }
    })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/analyst/work-queue" className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{order.order_number}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
              {getPriorityLabel(order.priority)}
            </span>
            {isOverdue && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {(order as any).clients?.client_name} · Received {formatDateTime(order.date_received)}
          </p>
        </div>
        {hasAnyApproved && (
          <Link
            href={`/analyst/reports/${order.id}`}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition"
          >
            <FileText className="w-4 h-4" /> {order.status === 'completed' ? 'View / Download PDF' : 'Preview Report'}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Client Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-0.5">Company</p>
                <p className="font-medium text-slate-900">{(order as any).clients?.client_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Contact</p>
                <p className="font-medium text-slate-900">{order.customer_name ?? '—'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">
              Samples <span className="ml-2 text-xs font-normal text-slate-500">({samples.length})</span>
            </h2>
            {samples.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No samples on this order</p>
            ) : (
              <div className="space-y-3">
                {samples.map((sample: any) => (
                  <div key={sample.id} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900 font-mono">{sample.sample_id}</span>
                      {sample.matrix_type && <span className="text-xs text-slate-500">{sample.matrix_type}</span>}
                    </div>
                    {sample.collection_date && (
                      <p className="text-xs text-slate-400 mb-2">Collected {formatDate(sample.collection_date)}</p>
                    )}
                    <div className="space-y-1.5">
                      {(sample.sample_tests ?? []).map((st: any) => (
                        <div key={st.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                          <div>
                            <span className="font-medium text-slate-800">{st.tests?.name ?? '—'}</span>
                            <span className="text-xs text-slate-400 ml-2 capitalize">{st.tests?.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-600">
                              {st.qualifier === 'ND' ? 'ND' : [st.qualifier, st.result].filter(Boolean).join(' ') || '—'} {st.unit ?? ''}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RESULT_STATUS_BADGE[st.status] ?? ''}`}>
                              {st.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Timeline</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Received', value: order.date_received, icon: Calendar },
                { label: 'Due', value: order.date_due, icon: Calendar },
                { label: 'Assigned', value: order.date_assigned, icon: User },
                { label: 'Completed', value: order.date_completed, icon: Calendar },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-900">{value ? formatDate(value) : '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {isReleased ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800 font-medium">Released to client</p>
              </div>
              <div className="text-sm text-green-800 space-y-1">
                <p>Released by <span className="font-medium">{personName((order as any).released_by_profile)}</span></p>
                <p>{formatDateTime((order as any).released_at)}</p>
              </div>
            </div>
          ) : allApproved ? (
            <SubmitToClientPanel
              orderId={order.id}
              orderNumber={order.order_number}
              clientName={(order as any).clients?.client_name ?? order.customer_name ?? '—'}
              rows={approvedRows}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-semibold text-slate-900 mb-1">Ready for Client</h2>
              <p className="text-sm text-slate-500">
                {allSampleTests.filter((st: any) => st.status !== 'approved').length} of {allSampleTests.length} result(s)
                still need to be entered, reviewed, or approved before this order can be submitted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
