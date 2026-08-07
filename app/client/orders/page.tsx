import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  review: { label: 'In Review', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

export default async function ClientOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', user!.id)
    .single()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, priority, date_received, date_due, date_completed')
    .eq('client_id', client?.id ?? '')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
          <p className="text-slate-500 mt-1">All your laboratory orders</p>
        </div>
        <Link
          href="/client/orders/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl transition"
        >
          <PlusCircle className="w-4 h-4" />
          New Order
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100 bg-slate-50">
              <th className="px-6 py-3 font-medium">Order #</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Received</th>
              <th className="px-6 py-3 font-medium">Due</th>
              <th className="px-6 py-3 font-medium">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(orders ?? []).map(order => {
              const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' }
              return (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/client/orders/${order.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(order.date_received)}</td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(order.date_due)}</td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(order.date_completed)}</td>
                </tr>
              )
            })}
            {(orders ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                  No orders yet —{' '}
                  <Link href="/client/orders/new" className="text-blue-600 hover:text-blue-700 font-medium">
                    submit your first order
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
