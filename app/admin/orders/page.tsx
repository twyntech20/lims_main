import { createClient } from '@/lib/supabase/server'
import { formatDate, getOrderStatusColor, getPriorityColor, getPriorityLabel } from '@/lib/utils'
import Link from 'next/link'
import { PlusCircle, Search } from 'lucide-react'
import PriorityFilter from '@/components/orders/PriorityFilter'

const STATUS_LABELS: Record<string, string> = {
  new: 'New', submitted: 'Submitted', in_progress: 'In Progress',
  review: 'In Review', completed: 'Completed', cancelled: 'Cancelled',
}

interface Props {
  searchParams: Promise<{ status?: string; priority?: string; q?: string }>
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, status, priority, date_received, date_due, date_completed,
      clients(client_name),
      profiles!orders_assigned_analyst_id_fkey(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  if (params.status)   query = query.eq('status', params.status)
  if (params.priority) query = query.eq('priority', params.priority)

  const { data: orders } = await query

  const filteredOrders = params.q
    ? (orders ?? []).filter((o: any) =>
        o.order_number?.toLowerCase().includes(params.q!.toLowerCase()) ||
        o.clients?.client_name?.toLowerCase().includes(params.q!.toLowerCase())
      )
    : (orders ?? [])

  const statusCounts = (orders ?? []).reduce((acc: Record<string, number>, o: any) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{(orders ?? []).length} total orders</p>
        </div>
        <Link
          href="/admin/orders/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          New Order
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[undefined, 'new', 'submitted', 'in_progress', 'review', 'completed', 'cancelled'].map(s => {
          const label  = s ? STATUS_LABELS[s] : 'All'
          const count  = s ? (statusCounts[s] ?? 0) : (orders ?? []).length
          const active = (params.status ?? '') === (s ?? '')
          return (
            <Link
              key={s ?? 'all'}
              href={s ? `/admin/orders?status=${s}` : '/admin/orders'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Search + priority filter */}
      <div className="flex gap-3 mb-5">
        <form className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            name="q"
            defaultValue={params.q}
            placeholder="Search by order # or client…"
            className="w-full pl-9 pr-16 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {params.status   && <input type="hidden" name="status"   value={params.status} />}
          {params.priority && <input type="hidden" name="priority" value={params.priority} />}
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-medium">
            Search
          </button>
        </form>
        {/* Client component — contains onChange */}
        <PriorityFilter current={params.priority} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 font-medium">Order #</th>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Priority</th>
              <th className="px-5 py-3 font-medium">Analyst</th>
              <th className="px-5 py-3 font-medium">Received</th>
              <th className="px-5 py-3 font-medium">Due</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredOrders.map((order: any) => {
              const analyst = order.profiles
                ? [order.profiles.first_name, order.profiles.last_name].filter(Boolean).join(' ')
                : null
              return (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-5 py-3.5 font-medium text-slate-900">{order.order_number}</td>
                  <td className="px-5 py-3.5 text-slate-700">{order.clients?.client_name ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                      {getPriorityLabel(order.priority)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {analyst ?? <span className="text-slate-300">Unassigned</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(order.date_received)}</td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {order.date_due ? (
                      <span className={
                        new Date(order.date_due) < new Date() && !['completed','cancelled'].includes(order.status)
                          ? 'text-red-600 font-medium' : ''
                      }>
                        {formatDate(order.date_due)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-xs opacity-0 group-hover:opacity-100 transition"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
