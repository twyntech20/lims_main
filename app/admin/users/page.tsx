import { createClient } from '@/lib/supabase/server'
import { Plus, Users } from 'lucide-react'
import UserCard from '@/components/users/UserCard'
import {
  Page, PageHeader, Tabs, FilterBar, SearchField, ButtonLink, EmptyState, Panel,
} from '@/components/ui/primitives'

const ROLE_TABS = ['all', 'admin', 'manager', 'analyst', 'client'] as const
type RoleTab = typeof ROLE_TABS[number]

interface SearchParams { role?: RoleTab; search?: string }
interface Props { searchParams: Promise<SearchParams> }

const ROLE_LABEL: Record<string, string> = {
  all: 'All', admin: 'Admin', manager: 'Manager', analyst: 'Analyst', client: 'Client',
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
    // Soft-deleted accounts are retained for their data, not for display.
    .is('deleted_at', null)
    .order('first_name')

  if (role !== 'all') query = query.eq('role', role)
  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%`)
  }

  const { data: profiles } = await query

  // Counts per role for tab badges
  const { data: allProfiles } = await supabase.from('profiles').select('role, is_active').is('deleted_at', null)
  const counts: Record<string, number> = { all: allProfiles?.length ?? 0 }
  for (const p of allProfiles ?? []) {
    counts[p.role] = (counts[p.role] ?? 0) + 1
  }
  const inactive = (allProfiles ?? []).filter(p => !p.is_active).length

  const rows = profiles ?? []

  const tabHref = (tab: RoleTab) => {
    const p = new URLSearchParams()
    if (tab !== 'all') p.set('role', tab)
    if (search) p.set('search', search)
    const qs = p.toString()
    return `/admin/users${qs ? `?${qs}` : ''}`
  }

  return (
    <Page>
      <PageHeader
        title="Users"
        description="Laboratory staff and client portal accounts"
        meta={
          <>
            {counts.all} account{counts.all === 1 ? '' : 's'}
            {inactive > 0 && <> · <span className="text-ink-4">{inactive} inactive</span></>}
          </>
        }
        actions={isAdmin && (
          <ButtonLink href="/admin/users/new" variant="primary">
            <Plus className="h-3.5 w-3.5" /> New user
          </ButtonLink>
        )}
      />

      <div className="mb-3">
        <Tabs
          items={ROLE_TABS.map(tab => ({
            key: tab,
            label: ROLE_LABEL[tab],
            href: tabHref(tab),
            count: counts[tab] ?? 0,
            active: role === tab,
          }))}
        />
      </div>

      <FilterBar
        hidden={{ role: role !== 'all' ? role : undefined }}
        clearHref={role === 'all' ? '/admin/users' : `/admin/users?role=${role}`}
        active={!!search}
        count={rows.length}
      >
        <SearchField name="search" defaultValue={search} placeholder="Search name, email or company…" />
      </FilterBar>

      {rows.length === 0 ? (
        <Panel>
          {search ? (
            <EmptyState
              icon={Users}
              title="No results found"
              description="Try adjusting your search or switching role tabs."
              action={<ButtonLink href={tabHref(role)} variant="secondary">Clear search</ButtonLink>}
              compact
            />
          ) : (
            <EmptyState
              icon={Users}
              title={role === 'all' ? 'No users yet' : `No ${ROLE_LABEL[role].toLowerCase()} accounts`}
              description={role === 'all'
                ? 'Create the first account to give someone access.'
                : 'Nobody currently holds this role.'}
              action={isAdmin
                ? <ButtonLink href="/admin/users/new" variant="primary"><Plus className="h-3.5 w-3.5" /> New user</ButtonLink>
                : undefined}
              compact={role !== 'all'}
            />
          )}
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((profile: any) => (
            <UserCard
              key={profile.id}
              profile={profile}
              isAdmin={isAdmin}
              isSelf={profile.id === me!.id}
            />
          ))}
        </div>
      )}
    </Page>
  )
}
