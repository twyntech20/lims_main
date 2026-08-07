import { createClient } from '@/lib/supabase/server'
import ClientNewOrderForm from '@/components/orders/ClientNewOrderForm'

export default async function ClientNewOrderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: client }, { data: tests }] = await Promise.all([
    supabase.from('clients').select('id, company_name').eq('profile_id', user!.id).single(),
    supabase.from('tests').select('id, name, code, category').eq('is_active', true).order('category').order('name'),
  ])

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('client_id', client?.id ?? '')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Submit New Order</h1>
        <p className="text-slate-500 mt-1">Fill in your sample details and we'll take care of the rest</p>
      </div>
      <ClientNewOrderForm projects={projects ?? []} tests={tests ?? []} />
    </div>
  )
}
