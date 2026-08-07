import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditOrderForm from '@/components/orders/EditOrderForm'

interface Props { params: Promise<{ id: string }> }

export default async function EditOrderPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [orderRes, clientsRes] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).single(),
    supabase.from('clients').select('id, client_name, email, phone').order('client_name'),
  ])

  if (orderRes.error || !orderRes.data) notFound()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Order</h1>
      <EditOrderForm order={orderRes.data as any} clients={clientsRes.data ?? []} />
    </div>
  )
}
