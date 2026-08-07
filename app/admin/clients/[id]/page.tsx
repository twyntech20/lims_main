import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Calendar } from 'lucide-react'
import EditClientForm from '@/components/clients/EditClientForm'
import { formatDate, getOrderStatusColor } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

const TAG_COLORS: Record<string, string> = {
  soil: 'bg-amber-100 text-amber-700',
  food: 'bg-orange-100 text-orange-700',
  water: 'bg-blue-100 text-blue-700',
  chemistry: 'bg-purple-100 text-purple-700',
  microbiology: 'bg-green-100 text-green-700',
  legionella: 'bg-red-100 text-red-700',
}

export default async function AdminClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client, error }, { data: orders }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase
      .from('orders')
      .select('id, order_number, status, priority, created_at, date_due')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (error || !client) notFound()

  const tags = client.tags ? (client.tags as string).split(',').filter(Boolean) : []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/clients" className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{client.client_name as string}</h1>
            {client.client_id && (
              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {client.client_id as string}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map(tag => (
              <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] ?? 'bg-slate-100 text-slate-600'}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <Link
          href={`/admin/orders/new?client_id=${id}`}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition"
        >
          <Package className="w-4 h-4" /> New Order
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Edit Form */}
        <div className="col-span-2">
          <EditClientForm client={client as any} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Orders */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Recent Orders</h2>
              <Link
                href={`/admin/orders?client=${id}`}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {(orders ?? []).slice(0, 8).map((order: any) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition group"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition">
                      {order.order_number}
                    </p>
                    {order.date_due && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> Due {formatDate(order.date_due)}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getOrderStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </Link>
              ))}
              {(orders ?? []).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No orders yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
