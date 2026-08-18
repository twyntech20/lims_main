import { createClient } from '@/lib/supabase/server'
import { Plus, TestTube, Pencil, FlaskConical, Microscope, Layers } from 'lucide-react'
import TestToggle from '@/components/tests/TestToggle'
import {
  Page, PageHeader, FilterBar, Select, SearchField, ButtonLink, IconButton,
  Badge, Mono, Table, Th, Td, Tr, TableWrap, EmptyState, Stacked,
} from '@/components/ui/primitives'

interface SearchParams { category?: string; search?: string; status?: string }
interface Props { searchParams: Promise<SearchParams> }

/* Categories keep a stable icon and order so the grid reads the same
   way on every visit. Colour is not used to distinguish them — the
   heading does that. */
const GROUPS = [
  { key: 'chemistry',    label: 'Chemistry',    icon: FlaskConical },
  { key: 'microbiology', label: 'Microbiology', icon: Microscope },
  { key: 'other',        label: 'Other',        icon: Layers },
] as const

export default async function TestsPage({ searchParams }: Props) {
  const { category, search, status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tests')
    .select('id, name, code, category, method, unit, turnaround_days, is_active, matrix, tat_general, subcontracted')
    .order('category')
    .order('name')

  if (category) query = query.eq('category', category)
  if (status === 'active') query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)
  if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,method.ilike.%${search}%`)

  const { data: tests } = await query

  const rows = tests ?? []
  const totalActive = rows.filter(t => t.is_active).length
  const totalInactive = rows.filter(t => !t.is_active).length
  const hasFilters = !!(search || category || status)

  const grouped = GROUPS
    .map(g => ({
      ...g,
      items: g.key === 'other'
        ? rows.filter(t => t.category !== 'chemistry' && t.category !== 'microbiology')
        : rows.filter(t => t.category === g.key),
    }))
    .filter(g => g.items.length > 0)

  return (
    <Page wide>
      <PageHeader
        title="Test Catalog"
        description="Analyses offered by the laboratory, their methods and turnaround"
        meta={
          <>
            {rows.length} test{rows.length === 1 ? '' : 's'} · {totalActive} active
            {totalInactive > 0 && <> · <span className="text-ink-4">{totalInactive} inactive</span></>}
          </>
        }
        actions={
          <ButtonLink href="/admin/tests/new" variant="primary">
            <Plus className="h-3.5 w-3.5" /> Add test
          </ButtonLink>
        }
      />

      <FilterBar clearHref="/admin/tests" active={hasFilters} count={rows.length} unit="matching">
        <SearchField name="search" defaultValue={search} placeholder="Search name, code or method…" />
        <Select name="category" defaultValue={category ?? ''} aria-label="Category">
          <option value="">All categories</option>
          <option value="chemistry">Chemistry</option>
          <option value="microbiology">Microbiology</option>
        </Select>
        <Select name="status" defaultValue={status ?? ''} aria-label="Status">
          <option value="">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </Select>
      </FilterBar>

      {rows.length === 0 ? (
        <TableWrap>
          {hasFilters ? (
            <EmptyState
              icon={TestTube}
              title="No results found"
              description="Try adjusting your search or filters."
              action={<ButtonLink href="/admin/tests" variant="secondary">Clear filters</ButtonLink>}
              compact
            />
          ) : (
            <EmptyState
              icon={TestTube}
              title="No tests in the catalog"
              description="Add the first analysis so orders can request it."
              action={<ButtonLink href="/admin/tests/new" variant="primary"><Plus className="h-3.5 w-3.5" /> Add test</ButtonLink>}
            />
          )}
        </TableWrap>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ key, label, icon: Icon, items }) => (
            <section key={key}>
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-ink-4" />
                <h2 className="text-[13px] font-semibold text-ink">{label}</h2>
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium tabular text-ink-3">
                  {items.length}
                </span>
              </div>

              <TableWrap maxHeight="calc(100vh - 340px)">
                <Table>
                  <thead>
                    <tr>
                      <Th>Analysis</Th>
                      <Th width="110px">Code</Th>
                      <Th width="160px">Method</Th>
                      <Th width="90px">Unit</Th>
                      <Th width="130px">Matrix</Th>
                      <Th width="120px">Turnaround</Th>
                      <Th width="96px">Status</Th>
                      <Th width="52px" align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(test => (
                      <Tr key={test.id} className={test.is_active ? undefined : 'opacity-60'}>
                        <Td>
                          <Stacked
                            primary={
                              <span className="font-medium">
                                {test.name}
                                {test.subcontracted && (
                                  <Badge tone="warn" className="ml-2 align-middle">sub-lab</Badge>
                                )}
                              </span>
                            }
                          />
                        </Td>
                        <Td className="whitespace-nowrap">
                          {test.code ? <Mono className="text-ink-2">{test.code}</Mono> : <span className="text-ink-4">—</span>}
                        </Td>
                        <Td className="text-[12.5px] text-ink-3">
                          <span className="block max-w-[160px] truncate" title={test.method ?? ''}>
                            {test.method ?? '—'}
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap text-[12.5px] text-ink-3">{test.unit ?? '—'}</Td>
                        <Td className="text-[12px] text-ink-3">
                          <span className="block max-w-[130px] truncate" title={test.matrix ?? ''}>
                            {test.matrix ?? '—'}
                          </span>
                        </Td>
                        {/* The workbook TAT is authoritative; the legacy
                            integer is the fallback where it states none. */}
                        <Td className="whitespace-nowrap tabular text-[12.5px] text-ink-2">
                          {test.tat_general ?? (test.turnaround_days != null ? `${test.turnaround_days} days` : '—')}
                        </Td>
                        <Td><TestToggle id={test.id} isActive={test.is_active} /></Td>
                        <Td align="right">
                          <IconButton href={`/admin/tests/${test.id}`} label={`Edit ${test.name}`} icon={Pencil} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}
