import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Filter, ClipboardList, AlertTriangle, ArrowRight } from 'lucide-react'
import { formatDate, getPriorityLabel } from '@/lib/utils'
import { personName, waitingTime, isOverdue } from '@/lib/workflow'
import {
  Page, PageHeader, Tabs, Toolbar, Select, SearchField, ButtonLink, buttonClass,
  Badge, Mono, Table, Th, Td, Tr, TableWrap, EmptyState, type Tone,
} from '@/components/ui/primitives'
import { ProgressCell } from '@/components/ui/metrics'

const STATUS: Record<string, { label: string; tone: Tone }> = {
  new:         { label: 'New',         tone: 'neutral' },
  submitted:   { label: 'Submitted',   tone: 'info' },
  in_progress: { label: 'In Progress', tone: 'warn' },
  review:      { label: 'In Review',   tone: 'review' },
  completed:   { label: 'Released',    tone: 'ok' },
  cancelled:   { label: 'Cancelled',   tone: 'neutral' },
}

const PRIORITY_TONE: Record<string, Tone> = {
  normal: 'neutral', priority_48h: 'warn', priority_24h: 'warn', same_day: 'crit',
}

interface Props {
  searchParams: Promise<{ status?: string; priority?: string; q?: string; analyst?: string }>
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: orders }, { data: analysts }] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id, order_number, status, priority, date_received, date_due, date_completed,
        released_at, updated_at, assigned_analyst_id,
        clients(client_name),
        profiles!orders_assigned_analyst_id_fkey(first_name, last_name, email),
        samples(id, sample_tests(id, status))
      `)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, first_name, last_name, email')
      .in('role', ['analyst', 'admin', 'manager']).order('first_name'),
  ])

  const all = (orders ?? []) as any[]

  const filtered = all.filter(o => {
    if (params.status   && o.status !== params.status) return false
    if (params.priority && o.priority !== params.priority) return false
    if (params.analyst  && o.assigned_analyst_id !== params.analyst) return false
    if (params.q) {
      const hay = [o.order_number, o.clients?.client_name].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(params.q.toLowerCase())) return false
    }
    return true
  })

  const statusCounts = all.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1; return acc
  }, {})

  const href = (status?: string) => {
    const p = new URLSearchParams(
      Object.entries(params).filter(([k, v]) => v && k !== 'status') as [string, string][],
    )
    if (status) p.set('status', status)
    const qs = p.toString()
    return `/admin/orders${qs ? `?${qs}` : ''}`
  }

  const tabs = [
    { key: '', label: 'All', href: href(), count: all.length, active: !params.status },
    ...['new', 'submitted', 'in_progress', 'review', 'completed', 'cancelled'].map(s => ({
      key: s,
      label: STATUS[s].label,
      href: href(s),
      count: statusCounts[s] ?? 0,
      active: params.status === s,
    })),
  ]

  const overdueCount = all.filter(
    o => isOverdue(o.date_due) && !['completed', 'cancelled'].includes(o.status),
  ).length
  const hasFilters = !!(params.priority || params.q || params.analyst)

  return (
    <Page wide>
      <PageHeader
        title="Orders"
        meta={
          <>
            {all.length} order{all.length === 1 ? '' : 's'}
            {overdueCount > 0 && <> · <span className="font-medium text-crit-fg">{overdueCount} past due</span></>}
          </>
        }
        actions={
          <ButtonLink href="/admin/orders/new" variant="primary">
            <Plus className="h-3.5 w-3.5" /> New order
          </ButtonLink>
        }
      />

      <div className="mb-3"><Tabs items={tabs} /></div>

      <form>
        {params.status && <input type="hidden" name="status" value={params.status} />}
        <Toolbar>
          <SearchField defaultValue={params.q} placeholder="Search order number or client…" />
          <Select name="priority" defaultValue={params.priority ?? ''} aria-label="Priority">
            <option value="">All priorities</option>
            <option value="same_day">STAT (same day)</option>
            <option value="priority_24h">24 hour</option>
            <option value="priority_48h">48 hour</option>
            <option value="normal">Normal</option>
          </Select>
          <Select name="analyst" defaultValue={params.analyst ?? ''} aria-label="Assigned analyst">
            <option value="">All analysts</option>
            {analysts?.map(a => (
              <option key={a.id} value={a.id}>
                {[a.first_name, a.last_name].filter(Boolean).join(' ') || a.email}
              </option>
            ))}
          </Select>
          <button type="submit" className={buttonClass('secondary', 'sm')}>
            <Filter className="h-3 w-3" /> Apply
          </button>
          {hasFilters && (
            <a href={href(params.status)} className="px-1.5 text-[12px] text-ink-3 underline-offset-2 hover:text-ink hover:underline">
              Clear
            </a>
          )}
          <span className="ml-auto text-[12px] text-ink-3 tabular">{filtered.length} shown</span>
        </Toolbar>
      </form>

      {filtered.length === 0 ? (
        <TableWrap>
          <EmptyState
            icon={ClipboardList}
            title="No orders match these filters"
            description="Adjust the filters above, or create the first order."
            action={<ButtonLink href="/admin/orders/new" variant="primary"><Plus className="h-3.5 w-3.5" /> New order</ButtonLink>}
          />
        </TableWrap>
      ) : (
        <TableWrap maxHeight="calc(100vh - 260px)">
          <Table>
            <thead>
              <tr>
                <Th width="120px">Order #</Th>
                <Th>Client</Th>
                <Th width="90px" align="right">Samples</Th>
                <Th width="90px">Priority</Th>
                <Th width="150px">Analyst</Th>
                <Th width="120px">Progress</Th>
                <Th width="120px">Status</Th>
                <Th width="100px">Due</Th>
                <Th width="90px">Updated</Th>
                <Th width="70px" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const samples = order.samples ?? []
                const tests = samples.flatMap((s: any) => s.sample_tests ?? [])
                const approved = tests.filter((t: any) => t.status === 'approved').length
                const overdue = isOverdue(order.date_due) && !['completed', 'cancelled'].includes(order.status)
                const meta = STATUS[order.status] ?? { label: order.status, tone: 'neutral' as Tone }

                return (
                  <Tr key={order.id} flag={overdue ? 'crit' : undefined}>
                    <Td className="whitespace-nowrap">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                        <Mono>{order.order_number}</Mono>
                      </Link>
                    </Td>
                    <Td>
                      <span className="block max-w-[240px] truncate text-ink">{order.clients?.client_name ?? '—'}</span>
                    </Td>
                    <Td align="right" className="tabular">{samples.length}</Td>
                    <Td className="whitespace-nowrap">
                      {order.priority === 'normal'
                        ? <span className="text-[12px] text-ink-4">Normal</span>
                        : <Badge tone={PRIORITY_TONE[order.priority] ?? 'neutral'} dot>
                            {getPriorityLabel(order.priority)}
                          </Badge>}
                    </Td>
                    <Td className="whitespace-nowrap text-[12px]">
                      {order.profiles
                        ? personName(order.profiles)
                        : <span className="text-ink-4">Unassigned</span>}
                    </Td>
                    <Td>
                      {tests.length > 0
                        ? <ProgressCell done={approved} total={tests.length} />
                        : <span className="text-[12px] text-ink-4">No tests</span>}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Badge tone={meta.tone} dot={order.status !== 'new'}>{meta.label}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap tabular">
                      <span className={overdue ? 'font-medium text-crit-fg' : 'text-ink-2'}>
                        {formatDate(order.date_due)}
                      </span>
                      {overdue && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-crit-fg">
                          <AlertTriangle className="h-3 w-3" /> overdue
                        </div>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap tabular text-[12px] text-ink-3">
                      {order.updated_at ? `${waitingTime(order.updated_at)} ago` : '—'}
                    </Td>
                    <Td align="right">
                      <Link
                        href={`/admin/orders/${order.id}`}
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
