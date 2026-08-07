import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PrintButton from '@/components/reports/PrintButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      date_completed,
      date_received,
      assigned_analyst_id,
      profiles!orders_assigned_analyst_id_fkey (
        first_name,
        last_name,
        email
      ),
      samples (
        id,
        sample_id,
        matrix_type,
        collection_date,
        sample_tests (
          id,
          status,
          result,
          unit,
          qualifier,
          mdl,
          analyst_notes,
          tests (
            id,
            name,
            code,
            method,
            unit
          )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  const analyst = order.profiles as { first_name?: string; last_name?: string; email?: string } | null
  const analystName = analyst
    ? [analyst.first_name, analyst.last_name].filter(Boolean).join(' ') || analyst.email || '—'
    : '—'

  return (
    <>
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
          .print-page { padding: 32px; }
        }
      `}</style>

      <div className="p-6 max-w-4xl mx-auto print-page">
        {/* Back + Print controls */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link
            href="/admin/reports"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Reports
          </Link>
          <PrintButton />
        </div>

        {/* Report Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Laboratory Report</h1>
              <p className="text-slate-400 text-sm mt-1">Official Results Certificate</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{order.order_number}</p>
              <p className="text-xs text-slate-400 mt-0.5">Order Number</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-slate-100 pt-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Client</p>
              <p className="text-sm font-medium text-slate-800">{order.customer_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Date Received</p>
              <p className="text-sm font-medium text-slate-800">
                {order.date_received ? new Date(order.date_received).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Date Completed</p>
              <p className="text-sm font-medium text-slate-800">
                {order.date_completed ? new Date(order.date_completed).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Analyst</p>
              <p className="text-sm font-medium text-slate-800">{analystName}</p>
            </div>
          </div>
        </div>

        {/* Results by Sample */}
        <div className="space-y-6">
          {order.samples.map((sample) => {
            const approvedTests = (sample.sample_tests ?? []).filter(
              (st: { status: string }) => st.status === 'approved'
            )

            return (
              <div key={sample.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Sample Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sample ID</p>
                      <p className="text-base font-bold text-slate-900 font-mono">{sample.sample_id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Matrix</p>
                      <p className="text-sm text-slate-700">{sample.matrix_type ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Collection Date</p>
                      <p className="text-sm text-slate-700">
                        {sample.collection_date
                          ? new Date(sample.collection_date).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tests Results */}
                {approvedTests.length === 0 ? (
                  <div className="px-6 py-4 text-sm text-slate-400">No approved results for this sample.</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Test</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Result</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qualifier</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">MDL</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {approvedTests.map((st) => {
                        const test = (Array.isArray(st.tests) ? st.tests[0] : st.tests) as { name: string; code: string | null; method: string | null; unit: string | null } | null
                        return (
                          <tr key={st.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-2.5 text-sm font-medium text-slate-900">
                              {test?.name ?? '—'}
                              {test?.code && <span className="text-slate-400 font-mono ml-2 text-xs">({test.code})</span>}
                            </td>
                            <td className="px-4 py-2.5 text-sm font-mono text-slate-700">{st.result ?? '—'}</td>
                            <td className="px-4 py-2.5 text-sm text-slate-500">{st.unit ?? test?.unit ?? '—'}</td>
                            <td className="px-4 py-2.5 text-sm text-slate-500">{st.qualifier ?? '—'}</td>
                            <td className="px-4 py-2.5 text-sm font-mono text-slate-500">{st.mdl ?? '—'}</td>
                            <td className="px-4 py-2.5 text-sm text-slate-500">{test?.method ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>This report was generated on {new Date().toLocaleDateString()}.</p>
          <p className="mt-1">FQ Labs Laboratory Information System</p>
        </div>
      </div>
    </>
  )
}
