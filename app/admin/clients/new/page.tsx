import NewClientForm from '@/components/clients/NewClientForm'

export default function AdminNewClientPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New Client</h1>
        <p className="text-slate-500 mt-1 text-sm">Add a new client to the system</p>
      </div>
      <NewClientForm />
    </div>
  )
}
