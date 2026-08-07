import { createClient } from '@/lib/supabase/server'
import { ClipboardList, CheckCircle, Clock, PlusCircle, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function ClientDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, company_name')
    .eq('id', user!.id)
    .single()

  // Fetch all orders for this user (created_by = user.id) for stats
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, status')
    .eq('created_by', user!.id)

  const allOrderList = allOrders ?? []
  const totalOrders    = allOrderList.length
  const activeOrders   = allOrderList.filter(o => !['completed', 'cancelled'].includes(o.status)).length
  const completedOrders = allOrderList.filter(o => o.status === 'completed').length

  // Recent 10 orders with sample count
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, priority, date_received, date_due, samples(count)')
    .eq('created_by', user!.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Pending results: sample_tests not approved, for samples belonging to this user's orders
  const orderIds = allOrderList.map(o => o.id)
  let pendingResults = 0
  if (orderIds.length > 0) {
    const { data: samples } = await supabase
      .from('samples')
      .select('id')
      .in('order_id', orderIds)

    const sampleIds = (samples ?? []).map(s => s.id)

    if (sampleIds.length > 0) {
      const { count } = await supabase
        .from('sample_tests')
        .select('*', { count: 'exact', head: true })
        .in('sample_id', sampleIds)
        .neq('status', 'approved')

      pendingResults = count ?? 0
    }
  }

  const orderList = recentOrders ?? []

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    new:         { label: 'Draft',       color: 'bg-gray-100 text-gray-700' },
    submitted:   { label: 'Submitted',   color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
    review:      { label: 'In Review',   color: 'bg-purple-100 text-purple-700' },
    completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700' },
    cancelled:   { label: 'Cancelled',   color: 'bg-red-100 text-red-700' },
  }

  const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    normal: { label: 'Normal', color: 'text-slate-500' },
    rush:   { label: 'Rush',   color: 'text-orange-500 font-semibold' },
    stat:   { label: 'STAT',   color: 'text-red-600 font-bold' },
  }

  const displayName = profile?.first_name ?? profile?.company_name ?? 'Client'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {displayName}
          </h1>
          <p className="text-slate-500 mt-1">Track your laboratory orders and results</p>
        </div>
        <Link
          href="/client/orders/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          New Order
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="inline-flex p-2 rounded-xl mb-3 text-blue-600 bg-blue-50">
            <ClipboardList className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalOrders}</p>
          <p className="text-xs text-slate-500 mt-1">Total Orders</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="inline-flex p-2 rounded-xl mb-3 text-yellow-600 bg-yellow-50">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeOrders}</p>
          <p className="text-xs text-slate-500 mt-1">Active Orders</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="inline-flex p-2 rounded-xl mb-3 text-green-600 bg-green-50">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{completedOrders}</p>
          <p className="text-xs text-slate-500 mt-1">Completed Orders</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="inline-flex p-2 rounded-xl mb-3 text-orange-600 bg-orange-50">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{pendingResults}</p>
          <p className="text-xs text-slate-500 mt-1">Pending Results</p>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Orders</h2>
          <Link href="/client/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 font-medium">Order #</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Priority</th>
                <th className="px-6 py-3 font-medium">Date Received</th>
                <th className="px-6 py-3 font-medium">Due Date</th>
                <th className="px-6 py-3 font-medium text-center"># Samples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orderList.map(order => {
                const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' }
                const pri = PRIORITY_CONFIG[order.priority] ?? { label: order.priority, color: 'text-slate-500' }
                const sampleCount = Array.isArray((order as any).samples)
                  ? (order as any).samples[0]?.count ?? 0
                  : 0
                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link href={`/client/orders/${order.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs ${pri.color}`}>{pri.label}</span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{formatDate(order.date_received)}</td>
                    <td className="px-6 py-3.5 text-slate-500">{formatDate(order.date_due)}</td>
                    <td className="px-6 py-3.5 text-center text-slate-600 font-medium">{sampleCount}</td>
                  </tr>
                )
              })}
              {orderList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-400 mb-3">No orders yet</p>
                    <Link href="/client/orders/new" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                      Submit your first order →
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
