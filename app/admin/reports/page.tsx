import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, ExternalLink } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()

  // Get completed orders that have approved results
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      date_completed,
      samples (
        sample_tests (
          id,
          status
        )
      )
    `)
    .eq('status', 'completed')
    .order('date_completed', { ascending: false })

  // Filter to only orders with at least one approved result
  const ordersWithApproved = (orders ?? []).filter(order => {
    const allTests = order.samples.flatMap((s: { sample_tests: { id: string; status: string }[] }) => s.sample_tests)
    return allTests.some((t: { status: string }) => t.status === 'approved')
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {ordersWithApproved.length} completed orders with approved results
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {!ordersWithApproved.length ? (
          <div className="p-16 text-center">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No completed reports available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date Completed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"># Approved Results</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ordersWithApproved.map((order) => {
                  const allTests = order.samples.flatMap((s: { sample_tests: { id: string; status: string }[] }) => s.sample_tests)
                  const approvedCount = allTests.filter((t: { status: string }) => t.status === 'approved').length
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3 text-sm font-mono font-medium text-slate-900">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{order.customer_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                        {order.date_completed
                          ? new Date(order.date_completed).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                          {approvedCount} approved
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/reports/${order.id}`}
                          className="inline-flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Report
                        </Link>
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
