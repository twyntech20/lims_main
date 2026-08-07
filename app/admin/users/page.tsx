import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import UserCard from '@/components/users/UserCard'

const ROLE_TABS = ['all', 'admin', 'manager', 'analyst', 'client'] as const
type RoleTab = typeof ROLE_TABS[number]

interface SearchParams { role?: RoleTab; search?: string }
interface Props { searchParams: Promise<SearchParams> }

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  analyst: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const { role = 'all', search } = await searchParams
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()

  // Get caller role to know if they can edit
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', me!.id).single()
  const isAdmin = callerProfile?.role === 'admin'

  let query = supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, is_active, phone_number, company_name, specialty_chemistry, specialty_microbiology, specialties_list, created_at')
    .order('first_name')

  if (role !== 'all') query = query.eq('role', role)
  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%`)
  }

  const { data: profiles } = await query

  // Counts per role for tab badges
  const { data: allProfiles } = await supabase.from('profiles').select('role')
  const counts: Record<string, number> = { all: allProfiles?.length ?? 0 }
  for (const p of allProfiles ?? []) {
    counts[p.role] = (counts[p.role] ?? 0) + 1
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">{profiles?.length ?? 0} shown</p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/users/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> New User
          </Link>
        )}
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {ROLE_TABS.map(tab => (
          <Link
            key={tab}
            href={`/admin/users?role=${tab}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
              role === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'all' ? 'All' : tab}
            <span className={`ml-1.5 text-xs ${role === tab ? 'text-slate-600' : 'text-slate-400'}`}>
              {counts[tab] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      {/* Search */}
      <form className="relative mb-5">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search by name, email, or company…"
          className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {role !== 'all' && <input type="hidden" name="role" value={role} />}
      </form>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(profiles ?? []).map((profile: any) => (
          <UserCard
            key={profile.id}
            profile={profile}
            isAdmin={isAdmin}
            isSelf={profile.id === me!.id}
            roleColors={ROLE_COLORS}
          />
        ))}
        {(profiles ?? []).length === 0 && (
          <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
            No users found
          </div>
        )}
      </div>
    </div>
  )
}
