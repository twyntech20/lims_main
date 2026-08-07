import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Download, Upload, Search, Tag, MapPin, Phone } from 'lucide-react'
import ClientsTableActions from '@/components/clients/ClientsTableActions'

const TAG_COLORS: Record<string, string> = {
  soil: 'bg-amber-100 text-amber-700',
  food: 'bg-orange-100 text-orange-700',
  water: 'bg-blue-100 text-blue-700',
  chemistry: 'bg-purple-100 text-purple-700',
  microbiology: 'bg-green-100 text-green-700',
  legionella: 'bg-red-100 text-red-700',
}

interface SearchParams { search?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function AdminClientsPage({ searchParams }: Props) {
  const { search } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('clients')
    .select('id, client_id, client_name, email, phone, city, state, tags, created_at')
    .order('client_name')

  // Search matches original AllClients.jsx — searches client_id, name, city, state, address, tags
  if (search) {
    query = query.or(
      `client_id.ilike.%${search}%,client_name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%,address.ilike.%${search}%,tags.ilike.%${search}%`
    )
  }

  const { data: clients } = await query

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clients?.length ?? 0} total</p>
        </div>
        <div className="flex items-center gap-2">
          <ClientsTableActions />
          <Link
            href="/admin/clients/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Client
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <form>
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by ID, name, city, state, address, or tags…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tags</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(clients ?? []).map(client => {
              const tags: string[] = client.tags ? (client.tags as string).split(',').filter(Boolean) : []
              return (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {client.client_id ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/clients/${client.id}`} className="font-medium text-slate-900 hover:text-blue-600 transition">
                      {client.client_name}
                    </Link>
                    {client.email && <p className="text-xs text-slate-400 mt-0.5">{client.email}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    {(client.city || client.state) ? (
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{[client.city, client.state].filter(Boolean).join(', ')}</span>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {client.phone ? (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {tags.map(tag => (
                        <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] ?? 'bg-slate-100 text-slate-600'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="text-xs text-slate-400 group-hover:text-blue-600 font-medium transition"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {(clients ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  {search ? 'No clients match your search' : 'No clients yet. Add your first client.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
