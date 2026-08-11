import { createClient } from '@/lib/supabase/server'
import ClientNewOrderForm from '@/components/orders/ClientNewOrderForm'

export default async function ClientNewOrderPage() {
  const supabase = await createClient()

  const { data: tests } = await supabase
    .from('tests').select('id, name, code, category').eq('is_active', true).order('category').order('name')

  // Projects are not linked to clients in the current schema — show all of them.
  const { data: rawProjects } = await supabase
    .from('projects').select('id, project_name').order('project_name')
  const projects = (rawProjects ?? []).map(p => ({ id: p.id, name: p.project_name }))

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
