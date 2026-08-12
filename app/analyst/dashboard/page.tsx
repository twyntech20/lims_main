import { createClient } from '@/lib/supabase/server'
import { Beaker, CheckSquare, Clock, ClipboardList } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function AnalystDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: myOrdersData } = await supabase.from('orders')
    .select('id, order_number, status, priority, date_due, clients(client_name)')
    .eq('assigned_analyst_id', user!.id)
    .not('status', 'in', '("completed","cancelled")')
    .order('date_due', { ascending: true })
    .limit(10)

  const orders = myOrdersData ?? []
  const inProgressCount = orders.filter(o => o.status === 'in_progress').length
  const reviewCount = orders.filter(o => o.status === 'review').length

  // Scoped with a plain .in() on this analyst's own order ids rather than an
  // embedded-resource dot-filter (`.eq('orders.assigned_analyst_id', ...)`
  // combined with count/head) — that combination silently ignored the filter
  // and returned the *global* pending-sample count instead of this analyst's.
  const myOrderIds = orders.map(o => o.id)
  const { count: pendingSamplesCount } = myOrderIds.length > 0
    ? await supabase.from('samples')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in('order_id', myOrderIds)
    : { count: 0 }

  const statCards = [
    { label: 'Assigned to Me', value: orders.length, icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
    { label: 'In Progress', value: inProgressCount, icon: Beaker, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'In Review', value: reviewCount, icon: Clock, color: 'text-purple-600 bg-purple-50' },
    { label: 'Pending Samples', value: pendingSamplesCount ?? 0, icon: CheckSquare, color: 'text-emerald-600 bg-emerald-50' },
  ]

  const PRIORITY_LABELS: Record<string, string> = {
    normal: 'Normal',
    same_day: 'Same Day',
    priority_24h: '24hr',
    priority_48h: '48hr',
  }

  const PRIORITY_COLORS: Record<string, string> = {
    normal: 'bg-gray-100 text-gray-600',
    same_day: 'bg-red-100 text-red-700',
    priority_24h: 'bg-orange-100 text-orange-700',
    priority_48h: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
        <p className="text-slate-500 mt-1">Your assigned work and queue</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className={`inline-flex p-2 rounded-xl mb-3 ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">My Assigned Orders</h2>
          <a href="/analyst/work-queue" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Open work queue →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                <th className="px-6 py-3 font-medium">Order #</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Priority</th>
                <th className="px-6 py-3 font-medium">Due</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-blue-600">{order.order_number}</td>
                  <td className="px-6 py-3.5 text-slate-700">{order.clients?.client_name ?? '—'}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[order.priority]}`}>
                      {PRIORITY_LABELS[order.priority] ?? order.priority}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">{formatDate(order.date_due)}</td>
                  <td className="px-6 py-3.5">
                    <span className="capitalize text-slate-600">{order.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    No orders assigned to you yet
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
