import Link from 'next/link'
import {
  AlertTriangle, ClipboardList, Clock3, FileCheck2, FlaskConical,
  GitPullRequestArrow, Send, ShieldCheck, Undo2, UserX,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { workflowState, isOverdue } from '@/lib/workflow'
import { Page, type Tone } from '@/components/ui/primitives'
import {
  resolvePeriod, within, countByDay, trend, meanHours, formatHours, rate, formatRate,
} from '@/lib/dashboard/metrics'
import { buildActivity, type AuditRow, type RecordRef } from '@/lib/dashboard/activity'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import KPICard from '@/components/dashboard/KPICard'
import Card from '@/components/dashboard/Card'
import OrderActivityChart from '@/components/dashboard/OrderActivityChart'
import OrderStatusCard, { type StatusRow } from '@/components/dashboard/OrderStatusCard'
import PerformanceCard, { type PerformanceMetric } from '@/components/dashboard/PerformanceCard'
import AttentionRequired, { type AttentionItem } from '@/components/dashboard/AttentionRequired'
import MyWork, { type MyWorkRow } from '@/components/dashboard/MyWork'
import RecentActivity from '@/components/dashboard/RecentActivity'
import AnalyticsCard, { type Slice } from '@/components/dashboard/AnalyticsCard'

interface SearchParams { period?: string; from?: string; to?: string }
interface Props { searchParams: Promise<SearchParams> }

const BASE = '/admin/dashboard'
const CLOSED = ['completed', 'cancelled']
const PRIORITY_RANK: Record<string, number> = { same_day: 0, priority_24h: 1, priority_48h: 2, normal: 3 }

/** Order status labels, matching the Orders list so one record never has two names. */
const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  new:         { label: 'New',         tone: 'neutral' },
  submitted:   { label: 'Submitted',   tone: 'info' },
  in_progress: { label: 'In Progress', tone: 'warn' },
  review:      { label: 'In Review',   tone: 'review' },
  completed:   { label: 'Released',    tone: 'ok' },
  cancelled:   { label: 'Cancelled',   tone: 'neutral' },
}

export default async function AdminDashboard({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const period = resolvePeriod(sp)

  const [profileRes, unreadRes, ordersRes, samplesRes, resultsRes, auditRes, amendmentsRes] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name, email').eq('id', user!.id).single(),
    supabase.from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id).eq('is_read', false),
    supabase.from('orders').select(`
      id, order_number, status, priority, created_at, date_received, date_due,
      date_completed, released_at, assigned_analyst_id,
      clients ( client_name )
    `),
    supabase.from('samples').select('id, sample_id, order_id, status, created_at'),
    supabase.from('sample_tests').select(`
      id, status, created_at, entered_at, approved_at, returned_at, review_round,
      assigned_reviewer_id, entered_by,
      samples ( id, order_id, orders ( id, date_due, released_at, assigned_analyst_id ) ),
      tests ( name, category )
    `),
    // Deliberately over-fetched: consecutive identical rows are collapsed
    // below, so a bulk catalog import cannot crowd out workflow events.
    supabase.from('audit_logs')
      .select('id, action, table_name, record_id, created_at, profiles ( first_name, last_name, email )')
      .order('created_at', { ascending: false })
      .limit(120),
    supabase.from('amendments').select('id, status'),
  ])

  const profile = profileRes.data as any
  const orders = (ordersRes.data ?? []) as any[]
  const samples = (samplesRes.data ?? []) as any[]
  const results = (resultsRes.data ?? []) as any[]
  const audit = (auditRes.data ?? []) as unknown as AuditRow[]
  const amendments = (amendmentsRes.data ?? []) as any[]

  const displayName = profile?.first_name || profile?.email?.split('@')[0] || 'there'

  // ── Period windows ─────────────────────────────────────────
  const inNow  = (ts: string | null | undefined) => within(ts, period.from, period.to)
  const inPrev = (ts: string | null | undefined) => within(ts, period.prevFrom, period.prevTo)

  const ordersNow    = orders.filter(o => inNow(o.created_at))
  const ordersPrev   = orders.filter(o => inPrev(o.created_at))
  const samplesNow   = samples.filter(s => inNow(s.created_at))
  const samplesPrev  = samples.filter(s => inPrev(s.created_at))
  const approvedNow  = results.filter(r => inNow(r.approved_at))
  const approvedPrev = results.filter(r => inPrev(r.approved_at))

  // Turnaround only exists once an order has actually reached the client —
  // released_at is the only stored fact that stops the clock.
  const releasedNow  = orders.filter(o => inNow(o.released_at) && o.date_received)
  const releasedPrev = orders.filter(o => inPrev(o.released_at) && o.date_received)
  const tatNow  = meanHours(releasedNow.map(o => ({ start: o.date_received, end: o.released_at })))
  const tatPrev = meanHours(releasedPrev.map(o => ({ start: o.date_received, end: o.released_at })))

  // ── Result workflow rollup (live) ──────────────────────────
  const stateOf = (r: any) => workflowState({
    status: r.status,
    returned_at: r.returned_at,
    assigned_reviewer_id: r.assigned_reviewer_id,
    order_released_at: r.samples?.orders?.released_at,
  })
  const byState = results.reduce<Record<string, number>>((acc, r) => {
    const s = stateOf(r); acc[s] = (acc[s] ?? 0) + 1; return acc
  }, {})
  const stateCount = (s: string) => byState[s] ?? 0

  const openOrders       = orders.filter(o => !CLOSED.includes(o.status))
  const overdueOrders    = openOrders.filter(o => isOverdue(o.date_due))
  const unassignedOrders = openOrders.filter(o => !o.assigned_analyst_id)
  const overdueReviews   = results.filter(r => r.status === 'reviewed' && isOverdue(r.samples?.orders?.date_due))
  const pendingAmendments = amendments.filter(a => a.status === 'pending')
  const samplesPending   = samples.filter(s => s.status === 'pending')

  // ── Lifecycle: Received → In Progress → Review → Approved → Released ─
  // "Approved" is derived, not stored: every result on the order signed
  // off, but the report not yet released.
  const resultsByOrder = results.reduce<Record<string, any[]>>((acc, r) => {
    const oid = r.samples?.order_id
    if (oid) (acc[oid] ??= []).push(r)
    return acc
  }, {})
  const fullyApproved = new Set(
    Object.entries(resultsByOrder)
      .filter(([, rows]) => rows.length > 0 && rows.every(r => r.status === 'approved'))
      .map(([oid]) => oid),
  )

  const releasedOrders = orders.filter(o => o.released_at)
  const lifecycle: StatusRow[] = [
    {
      key: 'received', label: 'Received',
      count: orders.filter(o => ['new', 'submitted'].includes(o.status)).length,
      href: '/admin/orders?status=submitted',
      basis: 'Orders logged in but not yet started (status new or submitted).',
    },
    {
      key: 'in_progress', label: 'In Progress',
      count: orders.filter(o => o.status === 'in_progress' && !fullyApproved.has(o.id)).length,
      href: '/admin/orders?status=in_progress',
      basis: 'Orders being worked on the bench, with results still outstanding.',
    },
    {
      key: 'review', label: 'Review',
      count: orders.filter(o => o.status === 'review' && !fullyApproved.has(o.id)).length,
      href: '/admin/orders?status=review',
      basis: 'Orders whose results are with a reviewer.',
    },
    {
      key: 'approved', label: 'Approved',
      count: orders.filter(o => fullyApproved.has(o.id) && !o.released_at).length,
      href: '/admin/work-queue?status=approved',
      basis: 'Every result on the order is signed off, but the report has not been released.',
    },
    {
      key: 'released', label: 'Released',
      count: releasedOrders.length,
      href: '/admin/reports',
      basis: 'Reports released to the client (released_at is set).',
    },
  ]
  const readyToRelease = lifecycle[3].count
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length

  // ── Series ─────────────────────────────────────────────────
  const orderSeries    = countByDay(ordersNow.map(o => o.created_at), period.buckets)
  const approvedSeries = countByDay(approvedNow.map(r => r.approved_at), period.buckets)

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const activityData = period.buckets.map((b, i) => {
    const [, m, d] = b.split('-')
    return { label: `${d} ${MONTHS[Number(m) - 1]}`, Orders: orderSeries[i], Approved: approvedSeries[i] }
  })

  // ── Laboratory performance ─────────────────────────────────
  const resultTat     = meanHours(approvedNow.map(r => ({ start: r.entered_at, end: r.approved_at })))
  const firstPass     = approvedNow.filter(r => !r.returned_at && (r.review_round ?? 1) === 1).length
  const firstPassRate = rate(firstPass, approvedNow.length)
  const withDue       = releasedNow.filter(o => o.date_due)
  const onTimeRate    = rate(withDue.filter(o => new Date(o.released_at) <= new Date(o.date_due)).length, withDue.length)

  const performance: PerformanceMetric[] = [
    {
      label: 'Result turnaround',
      value: formatHours(resultTat),
      basis: `Mean time from result entry to reviewer approval, across the ${approvedNow.length} result(s) approved ${period.phrase}.`,
      unavailable: resultTat === null ? 'No results approved in this period.' : undefined,
    },
    {
      label: 'Tests completed',
      value: String(approvedNow.length),
      basis: `Sample tests whose approved_at falls ${period.phrase}.`,
    },
    {
      label: 'First-pass approval',
      value: formatRate(firstPassRate),
      percent: firstPassRate,
      tone: 'ok',
      basis: `Share of results approved ${period.phrase} that were never returned for correction (review round 1).`,
      unavailable: firstPassRate === null ? 'No results approved in this period.' : undefined,
    },
    {
      label: 'On-time release',
      value: formatRate(onTimeRate),
      percent: onTimeRate,
      tone: 'ok',
      basis: `Orders released on or before their due date, as a share of orders released ${period.phrase}.`,
      unavailable: onTimeRate === null ? 'No orders with a due date released in this period.' : undefined,
    },
  ]

  // ── Attention required (live) ──────────────────────────────
  const attention: AttentionItem[] = [
    { key: 'overdue-orders', label: 'Orders past their due date',
      detail: 'Open orders whose due date has passed',
      count: overdueOrders.length, href: '/admin/orders', severity: 'crit', icon: AlertTriangle },
    { key: 'overdue-reviews', label: 'Reviews past the order due date',
      detail: 'Results sitting with a reviewer on an overdue order',
      count: overdueReviews.length, href: '/admin/review-queue?due=overdue', severity: 'crit', icon: Clock3 },
    { key: 'returned', label: 'Results returned for correction',
      detail: 'Sent back to the analyst, not yet re-submitted',
      count: stateCount('returned'), href: '/admin/work-queue?status=returned', severity: 'warn', icon: Undo2 },
    { key: 'awaiting-reviewer', label: 'Awaiting reviewer assignment',
      detail: 'Entered results with no reviewer named yet',
      count: stateCount('awaiting_review'), href: '/admin/work-queue?status=entered', severity: 'warn', icon: ShieldCheck },
    { key: 'samples-pending', label: 'Samples awaiting processing',
      detail: 'Logged in but not yet started on the bench',
      count: samplesPending.length, href: '/admin/orders?status=submitted', severity: 'warn', icon: FlaskConical },
    { key: 'unassigned-orders', label: 'Orders with no analyst',
      detail: 'Open orders that have not been assigned',
      count: unassignedOrders.length, href: '/admin/orders', severity: 'warn', icon: UserX },
    { key: 'amendments', label: 'Amendments awaiting decision',
      detail: 'Change requests on released results',
      count: pendingAmendments.length, href: '/admin/amendments', severity: 'info', icon: GitPullRequestArrow },
    { key: 'ready-release', label: 'Reports ready to release',
      detail: 'All results signed off — the report can go to the client',
      count: readyToRelease, href: '/admin/work-queue?status=approved', severity: 'info', icon: Send },
  ]

  // ── My work ────────────────────────────────────────────────
  const reviewerOrderIds = new Set(
    results
      .filter(r => r.status === 'reviewed' && r.assigned_reviewer_id === user!.id)
      .map(r => r.samples?.order_id)
      .filter(Boolean),
  )

  const myWork: MyWorkRow[] = openOrders
    .filter(o => o.assigned_analyst_id === user!.id || reviewerOrderIds.has(o.id))
    .map(o => {
      const meta = STATUS_META[o.status]
      const asAnalyst = o.assigned_analyst_id === user!.id
      const asReviewer = reviewerOrderIds.has(o.id)
      return {
        id: o.id,
        orderNumber: o.order_number,
        client: o.clients?.client_name ?? '—',
        status: o.status,
        statusLabel: meta?.label ?? o.status,
        statusTone: meta?.tone ?? ('neutral' as Tone),
        priority: o.priority,
        dateDue: o.date_due,
        overdue: isOverdue(o.date_due),
        href: `/admin/orders/${o.id}`,
        role: asAnalyst && asReviewer ? '· analyst + reviewer' : asAnalyst ? '· analyst' : '· reviewer',
      }
    })
    .sort((a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      (a.dateDue ?? '9999').localeCompare(b.dateDue ?? '9999') ||
      (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9),
    )

  // ── Activity feed ──────────────────────────────────────────
  // Record references resolve against data already loaded above, so the
  // readable timeline costs no extra round trips.
  const refs = new Map<string, RecordRef>()
  for (const o of orders) refs.set(o.id, { label: o.order_number, href: `/admin/orders/${o.id}` })
  for (const s of samples) {
    refs.set(s.id, { label: s.sample_id, href: s.order_id ? `/admin/orders/${s.order_id}` : undefined })
  }
  for (const r of results) {
    const oid = r.samples?.order_id
    const order = oid ? orders.find(o => o.id === oid) : undefined
    if (order) refs.set(r.id, { label: order.order_number, href: `/admin/orders/${order.id}` })
  }
  const activity = buildActivity(audit, refs, 8)

  // ── Analytics (period-scoped; a card only mounts when it has data) ─
  const ordersByStatus: Slice[] = Object.keys(STATUS_META)
    .map(k => ({ name: STATUS_META[k].label, value: ordersNow.filter(o => o.status === k).length }))
    .filter(s => s.value > 0)

  const testsNow = results.filter(r => inNow(r.created_at))
  const categoryTally = testsNow.reduce<Record<string, number>>((acc, r) => {
    const c = (r.tests?.category ?? 'Uncategorised') as string
    const label = c.charAt(0).toUpperCase() + c.slice(1)
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {})
  const testsByCategory: Slice[] = Object.entries(categoryTally)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const clientTally = ordersNow.reduce<Record<string, number>>((acc, o) => {
    const name = o.clients?.client_name ?? 'Unknown client'
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})
  const ordersByClient: Slice[] = Object.entries(clientTally)
    .map(([name, value]) => ({ name: name.length > 22 ? `${name.slice(0, 21)}…` : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const analytics = [
    ordersByStatus.length > 0 && (
      <AnalyticsCard key="status" title="Orders by status" subtitle={`Created ${period.phrase}`}
                     kind="donut" data={ordersByStatus} valueLabel="Orders" />
    ),
    testsByCategory.length > 0 && (
      <AnalyticsCard key="category" title="Tests by category" subtitle={`Requested ${period.phrase}`}
                     kind="donut" data={testsByCategory} valueLabel="Tests" />
    ),
    ordersByClient.length > 0 && (
      <AnalyticsCard key="client" title="Orders by client" subtitle={`Top clients ${period.phrase}`}
                     kind="bar" data={ordersByClient} valueLabel="Orders" />
    ),
  ].filter(Boolean)

  // ── Header ─────────────────────────────────────────────────
  const openWork = stateCount('awaiting_entry') + stateCount('returned')
    + stateCount('awaiting_review') + stateCount('in_review')
  const summary = openWork === 0
    ? 'No results are open — the bench is clear.'
    : <>
        <span className="font-medium text-ink-2">{openWork}</span> result{openWork === 1 ? '' : 's'} in progress
        {overdueOrders.length > 0 && (
          <> · <span className="font-medium text-crit-fg">{overdueOrders.length} order{overdueOrders.length === 1 ? '' : 's'} past due</span></>
        )}
      </>

  const dateLabel = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Page wide>
      <DashboardHeader
        name={displayName}
        dateLabel={dateLabel}
        summary={summary}
        unreadCount={unreadRes.count ?? 0}
        period={period}
        basePath={BASE}
        searchPath="/admin/orders"
        newOrderHref="/admin/orders/new"
        profileHref="/admin/profile"
        notificationsHref="/admin/notifications"
      />

      {/* ── KPIs ───────────────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="Total orders" value={ordersNow.length} icon={ClipboardList} accent="brand"
          hint={`${openOrders.length} open right now`}
          trend={trend(ordersNow.length, ordersPrev.length)}
          href="/admin/orders"
        />
        <KPICard
          label="Samples" value={samplesNow.length} icon={FlaskConical} accent="review"
          hint={`${samplesPending.length} awaiting processing`}
          trend={trend(samplesNow.length, samplesPrev.length)}
          href="/admin/orders"
        />
        <KPICard
          label="Average TAT" value={formatHours(tatNow)} icon={Clock3} accent="warn"
          hint="Sample received → report released"
          note={tatNow === null
            ? 'No orders released in this period'
            : `Across ${releasedNow.length} released order${releasedNow.length === 1 ? '' : 's'}`}
          trend={tatNow !== null && tatPrev !== null ? trend(tatNow, tatPrev) : null}
          goodWhen="down"
          href="/admin/orders?status=completed"
        />
        <KPICard
          label="Results approved" value={approvedNow.length} icon={FileCheck2} accent="ok"
          hint={`${readyToRelease} report${readyToRelease === 1 ? '' : 's'} ready to release`}
          trend={trend(approvedNow.length, approvedPrev.length)}
          href="/admin/work-queue?status=approved"
        />
      </div>

      {/* ── Order activity + lifecycle ─────────────────────── */}
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Order activity"
          subtitle={`Orders received and results approved ${period.phrase}`}
          action={
            <div className="flex shrink-0 items-center gap-3 text-[11.5px] text-ink-3">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3.5 rounded-full bg-brand-600" /> Orders</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3.5 rounded-full bg-ink-4" /> Approved</span>
            </div>
          }
        >
          {activityData.length < 2 ? (
            <div className="flex h-[240px] flex-col items-center justify-center gap-1 text-center">
              <p className="text-[13px] font-medium text-ink">
                {ordersNow.length} order{ordersNow.length === 1 ? '' : 's'} · {approvedNow.length} result{approvedNow.length === 1 ? '' : 's'} approved
              </p>
              <p className="text-[12px] text-ink-3">A single day cannot show a trend — choose a longer range.</p>
            </div>
          ) : (
            <OrderActivityChart data={activityData} />
          )}
        </Card>

        <OrderStatusCard
          rows={lifecycle}
          total={orders.length}
          subtitle="Every order in the system, by lifecycle stage"
          href="/admin/orders"
          cancelled={cancelledOrders}
          cancelledHref="/admin/orders?status=cancelled"
        />
      </div>

      {/* ── Performance · exceptions ───────────────────────── */}
      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <PerformanceCard metrics={performance} subtitle={`Measured ${period.phrase}`} />
        <AttentionRequired items={attention} />
      </div>

      {/* ── Activity · my work ─────────────────────────────── */}
      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <RecentActivity events={activity} href="/admin/system-logs" />
        <MyWork rows={myWork} href="/admin/work-queue?reviewer=me" />
      </div>

      {/* ── Analytics — only where the period has real data ── */}
      {analytics.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-3">{analytics}</div>
      ) : (
        <div className="rounded-lg border border-dashed border-line-strong bg-surface-muted px-4 py-7 text-center">
          <p className="text-[13px] text-ink-3">
            No orders, samples or tests were recorded {period.phrase}.
          </p>
          <p className="mt-1 text-[12px] text-ink-4">
            Widen the date range, or{' '}
            <Link href="/admin/orders/new" className="font-medium text-brand-600 hover:text-brand-700">create an order</Link>.
          </p>
        </div>
      )}
    </Page>
  )
}
