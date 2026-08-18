import { createClient } from '@/lib/supabase/server'
import { GitPullRequestArrow, Plus, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'
import AmendmentActions from '@/components/amendments/AmendmentActions'
import { personName } from '@/lib/workflow'
import { formatDateTime } from '@/lib/utils'
import {
  Page, PageHeader, Tabs, ButtonLink, Badge, Mono, Stacked,
  Table, Th, Td, Tr, TableWrap, EmptyState, type Tone,
} from '@/components/ui/primitives'

interface SearchParams { status?: string }
interface Props { searchParams: Promise<SearchParams> }

const STATUS_TABS = [
  { label: 'All',      value: '' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const STATUS_TONE: Record<string, Tone> = {
  pending: 'warn', approved: 'ok', rejected: 'crit',
}

const STATUS_ICON: Record<string, React.ElementType> = {
  pending:  Clock,
  approved: CheckCircle,
  rejected: XCircle,
}

const VALUE_FIELDS = ['result', 'unit', 'qualifier', 'mdl', 'dilution_factor'] as const

// previous_value is a snapshot of the whole result taken at apply time;
// new_value only holds the fields the requester actually changed.
function valueDiff(previous: Record<string, any> | null, next: Record<string, any> | null) {
  if (!next) return []
  return VALUE_FIELDS
    .filter(f => next[f] !== undefined && next[f] !== null)
    .map(f => ({ field: f, from: previous?.[f] ?? null, to: next[f] }))
}

export default async function AmendmentsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('amendments')
    .select(`
      id,
      reason,
      description,
      status,
      created_at,
      reviewed_at,
      review_comment,
      applied_at,
      sample_test_id,
      previous_value,
      new_value,
      orders ( id, order_number ),
      sample_tests ( id, status, tests ( name ), samples ( sample_id ) ),
      requested_by_profile:profiles!amendments_requested_by_fkey ( first_name, last_name, email ),
      reviewed_by_profile:profiles!amendments_reviewed_by_fkey ( first_name, last_name, email )
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: amendments } = await query
  const rows = (amendments ?? []) as any[]
  const pendingCount = rows.filter(a => a.status === 'pending').length

  const tabs = STATUS_TABS.map(tab => ({
    key: tab.value || 'all',
    label: tab.label,
    href: tab.value ? `/admin/amendments?status=${tab.value}` : '/admin/amendments',
    count: tab.value ? rows.filter(a => a.status === tab.value).length : rows.length,
    active: (status ?? '') === tab.value,
  }))

  return (
    <Page wide>
      <PageHeader
        title="Amendments"
        description="Change requests raised against approved or released results"
        meta={
          <>
            {rows.length} request{rows.length === 1 ? '' : 's'}
            {pendingCount > 0 && <> · <span className="font-medium text-warn-fg">{pendingCount} awaiting decision</span></>}
          </>
        }
        actions={
          <ButtonLink href="/admin/amendments/new" variant="primary">
            <Plus className="h-3.5 w-3.5" /> Request amendment
          </ButtonLink>
        }
      />

      <div className="mb-3"><Tabs items={tabs} /></div>

      {rows.length === 0 ? (
        <TableWrap>
          <EmptyState
            icon={GitPullRequestArrow}
            title={status ? 'No results found' : 'No amendments yet'}
            description={status
              ? 'No amendments currently hold this status.'
              : 'Amendments appear here when someone requests a change to an approved result.'}
            action={status
              ? <ButtonLink href="/admin/amendments" variant="secondary">Show all</ButtonLink>
              : <ButtonLink href="/admin/amendments/new" variant="primary"><Plus className="h-3.5 w-3.5" /> Request amendment</ButtonLink>}
            compact={!!status}
          />
        </TableWrap>
      ) : (
        <TableWrap maxHeight="calc(100vh - 260px)">
          <Table>
            <thead>
              <tr>
                <Th width="120px">Order</Th>
                <Th width="180px">Target</Th>
                <Th width="200px">Reason</Th>
                <Th>Change</Th>
                <Th width="150px">Requested by</Th>
                <Th width="190px">Decision</Th>
                <Th width="110px">Status</Th>
                <Th width="150px" align="right" />
              </tr>
            </thead>
            <tbody>
              {rows.map(a => {
                const Icon = STATUS_ICON[a.status] ?? Clock
                const order = (Array.isArray(a.orders) ? a.orders[0] : a.orders) as { id: string; order_number: string } | null
                const st = (Array.isArray(a.sample_tests) ? a.sample_tests[0] : a.sample_tests) as any
                const targetLabel = st
                  ? `${st.samples?.sample_id ?? '—'} · ${st.tests?.name ?? 'test'}`
                  : null
                const diff = valueDiff(a.previous_value, a.new_value)

                return (
                  <Tr key={a.id} className="align-top" flag={a.status === 'pending' ? 'warn' : undefined}>
                    <Td className="whitespace-nowrap">
                      {order
                        ? <Mono className="font-medium text-ink">{order.order_number}</Mono>
                        : <span className="text-ink-4">—</span>}
                    </Td>
                    <Td>
                      <Stacked
                        primary={targetLabel ?? <span className="text-ink-4">Order-level</span>}
                        secondary={a.applied_at
                          ? <span className="text-ok-fg">Applied {formatDateTime(a.applied_at)}</span>
                          : undefined}
                      />
                    </Td>
                    <Td>
                      <Stacked primary={a.reason} secondary={a.description} />
                    </Td>
                    <Td>
                      {diff.length === 0 ? (
                        <span className="text-ink-4">—</span>
                      ) : (
                        <div className="space-y-0.5">
                          {diff.map(d => (
                            <div key={d.field} className="flex flex-wrap items-center gap-1 font-mono text-[11.5px]">
                              <span className="text-ink-4">{d.field}:</span>
                              <span className="text-crit-fg line-through">{d.from ?? '—'}</span>
                              <ArrowRight className="h-3 w-3 shrink-0 text-ink-4" />
                              <span className="font-semibold text-ok-fg">{String(d.to)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Stacked
                        primary={<span className="text-[12.5px]">{personName(a.requested_by_profile)}</span>}
                        secondary={new Date(a.created_at).toLocaleDateString('en-AU')}
                      />
                    </Td>
                    <Td>
                      {a.reviewed_at ? (
                        <div className="min-w-0">
                          <div className="truncate text-[12.5px] text-ink-2">{personName(a.reviewed_by_profile)}</div>
                          <div className="text-[11px] text-ink-4">{formatDateTime(a.reviewed_at)}</div>
                          {a.review_comment && (
                            <p className="mt-0.5 text-[11.5px] italic text-ink-3">{a.review_comment}</p>
                          )}
                        </div>
                      ) : <span className="text-ink-4">—</span>}
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[a.status] ?? 'neutral'}>
                        <Icon className="h-3 w-3" />
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </Badge>
                    </Td>
                    <Td align="right">
                      {a.status === 'pending' && (
                        <AmendmentActions
                          id={a.id}
                          appliesToResult={!!a.sample_test_id && !!a.new_value}
                          targetLabel={targetLabel}
                        />
                      )}
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
