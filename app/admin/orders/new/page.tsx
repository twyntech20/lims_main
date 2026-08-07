import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CocOrderForm from '@/components/orders/CocOrderForm'

export default async function NewOrderPage() {
  const supabase = await createClient()

  const [{ data: clients }, { data: tests }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, client_name, email, phone, address, city, state, zip')
      .order('client_name'),
    supabase
      .from('tests')
      .select('id, name, code, category')
      .eq('is_active', true)
      .order('category')
      .order('name'),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/orders" className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Chain of Custody</h1>
          <p className="text-slate-500 text-sm">Create a COC and analysis request</p>
        </div>
      </div>

      <CocOrderForm clients={clients ?? []} tests={tests ?? []} />
    </div>
  )
}
