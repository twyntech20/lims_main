import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  ClipboardList, FlaskConical, FileEdit, ShieldCheck, FileText, AlertTriangle,
  Plus, Activity,
} from 'lucide-react'
import DashboardCharts from '@/components/dashboard/DashboardCharts'
import { Page, PageHeader, Section, Panel, ButtonLink, Badge, Mono, EmptyState } from '@/components/ui/primitives'
import { StatTile, Pipeline, WorkItem } from '@/components/ui/metrics'
import { workflowState, isOverdue, personName, waitingTime } from '@/lib/workflow'

interface SearchParams { period?: string }
interface Props { searchParams: Promise<SearchParams> }

const PERIOD_LABELS: Record<string, string> = {
  today: 'Today', '7days': '7 days', '1month': '1 month', '1year': '1 year',
}

/** Audit actions rendered as plain language for the activity feed. */
const ACTION_LABEL: Record<string, { label: string; tone: 'neutral' | 'ok' | 'warn' | 'crit' | 'info' | 'review' }> = {
  result_submitted_for_review:  { label: 'Sent for review',   tone: 'info' },
  result_approved:              { label: 'Result approved',   tone: 'ok' },
  result_returned_for_changes:  { label: 'Returned',          tone: 'crit' },
  submitted_to_client:          { label: 'Released',          tone: 'ok' },
  amendment_applied:            { label: 'Amendment applied', tone: 'review' },
  pdf_generated:                { label: 'Report generated',  tone: 'neutral' },
  INSERT:                       { label: 'Created',           tone: 'neutral' },
  UPDATE:                       { label: 'Updated',           tone: 'neutral' },
  DELETE:                       { label: 'Deleted',           tone: 'crit' },
}

export default async function AdminDashboard({ searchParams }: Props) {
  const { period = '1month' } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('first_name, last_name').eq('id', user!.id).single()
  const displayName = (profile as any)?.first_name ?? 'there'

  const now = new Date()
  let since: Date
  switch (period) {
    case 'today':  since = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
    case '7days':  since = new Date(Date.now() - 7 * 86400000); break
    case '1year':  since = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break
    default:       since = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  }
  const sinceISO = since.toISOString()

  const [ordersRes, samplesRes, allOrdersRes, resultsRes, auditRes] = await Promise.all([
    supabase.from('orders').select('id, status, created_at').gte('created_at', sinceISO),
    supabase.from('samples').select('id').gte('created_at', sinceISO),
    // Every open order, for the lifecycle pipeline — a job stuck in review
    // last month is still stuck today.
    supabase.from('orders').select('id, status, date_due, released_at'),
    supabase.from('sample_tests').select(`
      id, status, returned_at, assigned_reviewer_id, entered_by, entered_at,
      samples ( id, order_id, orders ( id, date_due, released_at, assigned_analyst_id ) )
    `),
    supabase.from('audit_logs')
      .select('id, action, table_name, record_id, created_at, user_id, profiles ( first_name, last_name, email )')
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const orders     = (ordersRes.data ?? []) as any[]
  const allOrders  = (allOrdersRes.data ?? []) as any[]
  const results    = (resultsRes.data ?? []) as any[]
  const audit      = (auditRes.data ?? []) as any[]

  // ── Result workflow rollup ────────────────────────────────
  const stateOf = (r: any) => workflowState({
    status: r.status,
    returned_at: r.returned_at,
    assigned_reviewer_id: r.assigned_reviewer_id,
    order_released_at: r.samples?.orders?.released_at,
  })
  const byState = results.reduce<Record<string, number>>((acc, r) => {
    const s = stateOf(r); acc[s] = (acc[s] ?? 0) + 1; return acc
  }, {})
  const count = (s: string) => byState[s] ?? 0

  const overdueOrders = allOrders.filter(
    o => isOverdue(o.date_due) && !['completed', 'cancelled'].includes(o.status),
  ).length

  // ── Order lifecycle pipeline ──────────────────────────────
  // "Approved" is a computed stage: every result signed off but the
  // report not yet released.
  const approvedByOrder = new Set<string>()
  const orderResults = results.reduce<Record<string, any[]>>((acc, r) => {
    const oid = r.samples?.order_id
    if (oid) (acc[oid] ??= []).push(r)
    return acc
  }, {})
  for (const [oid, rows] of Object.entries(orderResults)) {
    if (rows.length > 0 && rows.every(r => r.status === 'approved')) approvedByOrder.add(oid)
  }
  const released = allOrders.filter(o => o.released_at).length
  const stages = [
    { key: 'received', label: 'Received',
      count: allOrders.filter(o => ['new', 'submitted'].includes(o.status)).length,
      href: '/admin/orders?status=submitted' },
    { key: 'progress', label: 'In progress',
      count: allOrders.filter(o => o.status === 'in_progress' && !approvedByOrder.has(o.id)).length,
      href: '/admin/orders?status=in_progress' },
    { key: 'review', label: 'Review',
      count: allOrders.filter(o => o.status === 'review' && !approvedByOrder.has(o.id)).length,
      href: '/admin/orders?status=review' },
    { key: 'approved', label: 'Approved',
      count: allOrders.filter(o => approvedByOrder.has(o.id) && !o.released_at).length,
      href: '/admin/work-queue?status=approved' },
    { key: 'released', label: 'Released', count: released, href: '/admin/reports' },
  ]

  // ── My work ───────────────────────────────────────────────
  const mine = {
    assignedToMe: results.filter(r => r.status === 'reviewed' && r.assigned_reviewer_id === user!.id).length,
    overdueReviews: results.filter(
      r => r.status === 'reviewed' && r.assigned_reviewer_id === user!.id && isOverdue(r.samples?.orders?.date_due),
    ).length,
    returned: count('returned'),
    awaitingEntry: count('awaiting_entry'),
    readyToRelease: count('approved'),
  }

  // ── Charts (only rendered when there is something to plot) ─
  const statusCounts: Record<string, number> = {}
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1
  const timeline: Record<string, number> = {}
  for (const o of orders) {
    const day = (o.created_at as string).slice(0, 10)
    timeline[day] = (timeline[day] ?? 0) + 1
  }
  const chartStatusData = Object.entries(statusCounts).map(([status, n]) => ({
    name: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), Orders: n,
  }))
  const chartTimelineData = Object.entries(timeline).sort(([a], [b]) => a.localeCompare(b))
    .map(([date, n]) => ({ date: date.slice(5), Orders: n }))
  const hasChartData = chartStatusData.length > 0 || chartTimelineData.length > 0

  const periodLabel = PERIOD_LABELS[period] ?? '1 month'
  const today = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const openWork = count('awaiting_entry') + count('returned') + count('awaiting_review') + count('in_review')
  const summary = openWork === 0
    ? 'No results are currently open. The bench is clear.'
    : `${openWork} result${openWork === 1 ? '' : 's'} in progress across the laboratory` +
      (overdueOrders > 0 ? ` · ${overdueOrders} order${overdueOrders === 1 ? '' : 's'} past due` : '')

  return (
    <Page wide>
      <PageHeader
        title={`Welcome, ${displayName}`}
        meta={<>{today} · {summary}</>}
        actions={
          <>
            <div className="hidden items-center rounded-md border border-line bg-surface p-0.5 shadow-xs sm:flex">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <Link
                  key={key}
                  href={`/admin/dashboard?period=${key}`}
                  className={`rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    period === key ? 'bg-brand-600 text-white' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
            <ButtonLink href="/admin/orders/new" variant="primary">
              <Plus className="h-3.5 w-3.5" /> New order
            </ButtonLink>
          </>
        }
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Orders"         value={orders.length}          hint={periodLabel} icon={ClipboardList} href="/admin/orders" />
        <StatTile label="Samples"        value={(samplesRes.data ?? []).length} hint={periodLabel} icon={FlaskConical} />
        <StatTile label="Tests pending"  value={count('awaiting_entry')} icon={FileEdit}   href="/admin/work-queue?status=pending" />
        <StatTile label="Reviews pending" value={count('in_review')}     icon={ShieldCheck} href="/admin/review-queue" />
        <StatTile label="Reports ready"  value={count('approved')}       icon={FileText}   href="/admin/work-queue?status=approved" />
        <StatTile label="Overdue"        value={overdueOrders}           icon={AlertTriangle} tone="crit" href="/admin/orders" />
      </div>

      <Section title="Order lifecycle">
        <Pipeline stages={stages} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* My work */}
        <div className="lg:col-span-2">
          <Section title="My work">
            <Panel className="overflow-hidden">
              <WorkItem label="Reviews assigned to me" count={mine.assignedToMe} tone="review" href="/admin/review-queue?reviewer=me" />
              <WorkItem label="Overdue reviews"        count={mine.overdueReviews} tone="crit" href="/admin/review-queue?reviewer=me" />
              <WorkItem label="Returned for changes"   count={mine.returned} tone="crit" href="/admin/work-queue?status=returned" />
              <WorkItem label="Results awaiting entry" count={mine.awaitingEntry} tone="warn" href="/admin/work-queue?status=pending" />
              <WorkItem label="Ready for release"      count={mine.readyToRelease} tone="ok" href="/admin/work-queue?status=approved" />
            </Panel>
          </Section>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-3">
          <Section
            title="Recent activity"
            actions={<Link href="/admin/system-logs" className="text-[12px] font-medium text-brand-600 hover:text-brand-700">Full audit log →</Link>}
          >
            <Panel className="overflow-hidden">
              {audit.length === 0 ? (
                <EmptyState icon={Activity} title="No recorded activity yet" compact />
              ) : (
                <ul className="divide-y divide-line">
                  {audit.map(entry => {
                    const meta = ACTION_LABEL[entry.action] ?? { label: entry.action, tone: 'neutral' as const }
                    return (
                      <li key={entry.id} className="flex items-center gap-3 px-3.5 py-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">
                          <span className="text-ink-2">{entry.table_name}</span>
                          {' · '}
                          <Mono className="text-ink-4">{String(entry.record_id).slice(0, 8)}</Mono>
                        </span>
                        <span className="hidden shrink-0 text-[12px] text-ink-3 sm:block">
                          {personName(entry.profiles)}
                        </span>
                        <span className="shrink-0 tabular text-[11px] text-ink-4">
                          {waitingTime(entry.created_at)} ago
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>
          </Section>
        </div>
      </div>

      {/* Analytics — omitted entirely when there is nothing to plot,
          rather than showing empty chart frames. */}
      {hasChartData && (
        <Section title="Analytics" description={`Order volume over the selected ${periodLabel.toLowerCase()}`}>
          <DashboardCharts
            statusData={chartStatusData}
            timelineData={chartTimelineData}
            periodLabel={periodLabel}
          />
        </Section>
      )}
    </Page>
  )
}
