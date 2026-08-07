import { createClient } from '@/lib/supabase/server'
import NewUserWizard from '@/components/users/NewUserWizard'

export default async function AdminNewUserPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, client_name')
    .order('client_name')

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New User</h1>
        <p className="text-slate-500 mt-1 text-sm">Create a new system user account</p>
      </div>
      <NewUserWizard clients={clients ?? []} />
    </div>
  )
}
