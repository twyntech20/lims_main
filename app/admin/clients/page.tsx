import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Briefcase, MapPin, Phone, Mail, ArrowRight } from 'lucide-react'
import ClientsTableActions from '@/components/clients/ClientsTableActions'
import { formatDate } from '@/lib/utils'
import {
  Page, PageHeader, FilterBar, SearchField, ButtonLink, Badge, Mono, Stacked,
  Table, Th, Td, Tr, TableWrap, EmptyState, CardGrid, CARD_VIEW_MAX,
} from '@/components/ui/primitives'

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

  const rows = clients ?? []
  const tagsOf = (c: { tags: string | null }) =>
    c.tags ? (c.tags as string).split(',').map(t => t.trim()).filter(Boolean) : []

  const location = (c: { city: string | null; state: string | null }) =>
    [c.city, c.state].filter(Boolean).join(', ')

  return (
    <Page>
      <PageHeader
        title="Clients"
        description="Organisations that submit samples to the laboratory"
        meta={<>{rows.length} client{rows.length === 1 ? '' : 's'}</>}
        secondary={<ClientsTableActions />}
        actions={
          <ButtonLink href="/admin/clients/new" variant="primary">
            <Plus className="h-3.5 w-3.5" /> New client
          </ButtonLink>
        }
      />

      <FilterBar clearHref="/admin/clients" active={!!search} count={rows.length} unit="shown">
        <SearchField
          name="search"
          defaultValue={search}
          placeholder="Search ID, name, city, state, address or tags…"
        />
      </FilterBar>

      {rows.length === 0 ? (
        <TableWrap>
          {search ? (
            <EmptyState
              icon={Briefcase}
              title="No results found"
              description="Try adjusting your search."
              action={<ButtonLink href="/admin/clients" variant="secondary">Clear search</ButtonLink>}
              compact
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No clients yet"
              description="Add your first client so orders can be logged against them."
              action={<ButtonLink href="/admin/clients/new" variant="primary"><Plus className="h-3.5 w-3.5" /> New client</ButtonLink>}
            />
          )}
        </TableWrap>
      ) : rows.length <= CARD_VIEW_MAX ? (
        /* Few enough records that a table would look stranded. */
        <CardGrid>
          {rows.map(client => {
            const tags = tagsOf(client)
            return (
              <div
                key={client.id}
                className="flex flex-col rounded-lg border border-line bg-surface shadow-xs transition-all hover:-translate-y-px hover:border-line-strong hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="block truncate text-[14px] font-semibold text-ink hover:text-brand-600"
                    >
                      {client.client_name}
                    </Link>
                    {client.client_id && <Mono className="text-ink-4">{client.client_id}</Mono>}
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
                    {client.client_name?.slice(0, 2).toUpperCase() ?? '—'}
                  </span>
                </div>

                <div className="space-y-1.5 px-4 py-3 text-[12.5px]">
                  <p className="flex items-center gap-1.5 text-ink-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-4" />
                    {location(client) || <span className="text-ink-4">No location on file</span>}
                  </p>
                  <p className="flex items-center gap-1.5 text-ink-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-ink-4" />
                    {client.phone || <span className="text-ink-4">No phone on file</span>}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-ink-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-ink-4" />
                    <span className="truncate">{client.email || <span className="text-ink-4">No email on file</span>}</span>
                  </p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tags.map(tag => <Badge key={tag} tone="brand">{tag}</Badge>)}
                    </div>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-line px-4 py-2">
                  <span className="text-[11.5px] text-ink-4">Added {formatDate(client.created_at)}</span>
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700"
                  >
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </CardGrid>
      ) : (
        <TableWrap maxHeight="calc(100vh - 260px)">
          <Table>
            <thead>
              <tr>
                <Th width="110px">Client ID</Th>
                <Th>Client</Th>
                <Th width="180px">Location</Th>
                <Th width="160px">Contact</Th>
                <Th width="200px">Tags</Th>
                <Th width="110px">Added</Th>
                <Th width="70px" align="right" />
              </tr>
            </thead>
            <tbody>
              {rows.map(client => {
                const tags = tagsOf(client)
                return (
                  <Tr key={client.id}>
                    <Td className="whitespace-nowrap">
                      {client.client_id
                        ? <Mono className="text-ink-2">{client.client_id}</Mono>
                        : <span className="text-ink-4">—</span>}
                    </Td>
                    <Td>
                      <Stacked
                        primary={
                          <Link href={`/admin/clients/${client.id}`} className="font-medium hover:text-brand-600">
                            {client.client_name}
                          </Link>
                        }
                        secondary={client.email ?? undefined}
                      />
                    </Td>
                    <Td className="text-[12.5px] text-ink-2">
                      {location(client) || <span className="text-ink-4">—</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-[12.5px] text-ink-2">
                      {client.phone || <span className="text-ink-4">—</span>}
                    </Td>
                    <Td>
                      {tags.length > 0
                        ? <div className="flex flex-wrap gap-1">{tags.map(t => <Badge key={t} tone="brand">{t}</Badge>)}</div>
                        : <span className="text-ink-4">—</span>}
                    </Td>
                    <Td className="whitespace-nowrap tabular text-[12.5px] text-ink-3">
                      {formatDate(client.created_at)}
                    </Td>
                    <Td align="right">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Page>
  )
}
