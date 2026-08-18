import { createClient } from '@/lib/supabase/server'
import { ScrollText } from 'lucide-react'
import { personName } from '@/lib/workflow'
import {
  Page, PageHeader, FilterBar, Select, ButtonLink, Badge, Mono, Stacked,
  Table, Th, Td, Tr, TableWrap, EmptyState, Pagination, type Tone,
} from '@/components/ui/primitives'
import LogDetails from '@/components/system-logs/LogDetails'

interface SearchParams { action?: string; table?: string; page?: string }
interface Props { searchParams: Promise<SearchParams> }

const PAGE_SIZE = 50

/* Actions carry a tone so a destructive event is distinguishable at a
   glance — the label always states what happened, colour only ranks it. */
const ACTION_TONE: Record<string, Tone> = {
  DELETE: 'crit',
  result_returned_for_changes: 'crit',
  result_approved: 'ok',
  submitted_to_client: 'ok',
  amendment_applied: 'review',
  amendment_requested: 'review',
  result_submitted_for_review: 'info',
  INSERT: 'neutral',
  UPDATE: 'neutral',
}

function actionLabel(action: string) {
  return action === action.toUpperCase() ? action : action.replace(/_/g, ' ')
}

export default async function SystemLogsPage({ searchParams }: Props) {
  const { action, table, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))

  const supabase = await createClient()

  // Distinct actions and entities, for the filter selects
  const { data: allLogs } = await supabase
    .from('audit_logs')
    .select('action, table_name')
    .limit(500)

  const actionTypes = [...new Set((allLogs ?? []).map(l => l.action).filter(Boolean))].sort()
  const tableTypes = [...new Set((allLogs ?? []).map(l => l.table_name).filter(Boolean))].sort()

  let query = supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      table_name,
      record_id,
      new_values,
      ip_address,
      created_at,
      profiles (
        first_name,
        last_name,
        email
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (action) query = query.eq('action', action)
  if (table) query = query.eq('table_name', table)

  const { data: logs, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const hasFilters = !!(action || table)

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (action) params.set('action', action)
    if (table) params.set('table', table)
    params.set('page', String(p))
    return `/admin/system-logs?${params.toString()}`
  }

  const rows = (logs ?? []) as any[]

  return (
    <Page wide>
      <PageHeader
        icon={ScrollText}
        title="Audit Log"
        description="Every recorded change, in order, with the account that made it"
        meta={<>{(count ?? 0).toLocaleString()} event{count === 1 ? '' : 's'}</>}
      />

      <FilterBar clearHref="/admin/system-logs" active={hasFilters} count={rows.length} unit="on this page">
        <Select name="action" defaultValue={action ?? ''} aria-label="Action">
          <option value="">All actions</option>
          {actionTypes.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </Select>
        <Select name="table" defaultValue={table ?? ''} aria-label="Entity type">
          <option value="">All entities</option>
          {tableTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
      </FilterBar>

      {rows.length === 0 ? (
        <TableWrap>
          {hasFilters ? (
            <EmptyState
              icon={ScrollText}
              title="No results found"
              description="Try adjusting the action or entity filter."
              action={<ButtonLink href="/admin/system-logs" variant="secondary">Clear filters</ButtonLink>}
              compact
            />
          ) : (
            <EmptyState
              icon={ScrollText}
              title="No audit events yet"
              description="System activity is recorded here as users interact with the platform."
            />
          )}
        </TableWrap>
      ) : (
        <TableWrap maxHeight="calc(100vh - 260px)">
          <Table>
            <thead>
              <tr>
                <Th width="140px">Timestamp</Th>
                <Th width="180px">User</Th>
                <Th width="190px">Action</Th>
                <Th width="140px">Entity</Th>
                <Th>Details</Th>
                <Th width="120px">IP</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(log => {
                const at = new Date(log.created_at)
                const actor = personName(log.profiles)
                return (
                  <Tr key={log.id}>
                    <Td className="whitespace-nowrap">
                      {/* Compact: date above, clock below, both tabular. */}
                      <Stacked
                        primary={
                          <span className="tabular text-[12.5px]">
                            {at.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </span>
                        }
                        secondary={
                          <span className="tabular">
                            {at.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        }
                      />
                    </Td>
                    <Td className="whitespace-nowrap text-[12.5px] text-ink-2">{actor}</Td>
                    <Td>
                      <Badge tone={ACTION_TONE[log.action] ?? 'neutral'} dot={ACTION_TONE[log.action] !== undefined}>
                        {actionLabel(log.action ?? '—')}
                      </Badge>
                    </Td>
                    <Td>
                      <Stacked
                        primary={<span className="text-[12.5px] text-ink-2">{log.table_name ?? '—'}</span>}
                        secondary={log.record_id
                          ? <span className="font-mono" title={log.record_id}>{String(log.record_id).slice(0, 8)}</span>
                          : undefined}
                      />
                    </Td>
                    <Td>
                      <LogDetails
                        values={log.new_values}
                        action={log.action}
                        table={log.table_name}
                        recordId={log.record_id}
                        at={log.created_at}
                        actor={actor}
                        ip={log.ip_address}
                      />
                    </Td>
                    <Td className="whitespace-nowrap">
                      {log.ip_address
                        ? <Mono className="text-ink-3">{log.ip_address}</Mono>
                        : <span className="text-[12px] text-ink-4">—</span>}
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={pageHref}
        total={count ?? 0}
        unit="events"
      />
    </Page>
  )
}
