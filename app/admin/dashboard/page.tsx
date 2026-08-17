import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users, FileBarChart, Settings, ClipboardList, FlaskConical, TestTube, BarChart3 } from 'lucide-react'
import DashboardCharts from '@/components/dashboard/DashboardCharts'
import WorkflowIndicators from '@/components/dashboard/WorkflowIndicators'

interface SearchParams { period?: string }
interface Props { searchParams: Promise<SearchParams> }

const PERIOD_LABELS: Record<string, string> = {
  today: 'Today',
  '7days': '7 Days',
  '1month': '1 Month',
  '1year': '1 Year',
}

export default async function AdminDashboard({ searchParams }: Props) {
  const { period = '1month' } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user!.id)
    .single()
  const displayName = (profile as any)?.first_name ?? 'Admin'

  // Date range for period
  const now = new Date()
  let since: Date
  switch (period) {
    case 'today':  since = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
    case '7days':  since = new Date(Date.now() - 7 * 86400000); break
    case '1year':  since = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break
    default:       since = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  }
  const sinceISO = since.toISOString()

  const [ordersRes, samplesRes, testsRes, workflowRes] = await Promise.all([
    supabase.from('orders').select('id, status, created_at').gte('created_at', sinceISO),
    supabase.from('samples').select('id').gte('created_at', sinceISO),
    supabase.from('tests').select('id').eq('is_active', true),
    // Workflow indicators are counted over every open result, not just the
    // selected period — a result stuck in review last month is still stuck.
    supabase.from('sample_tests').select(`
      status, returned_at, assigned_reviewer_id, entered_at,
      samples ( orders ( date_due, released_at ) )
    `),
  ])

  const workflowRows = (workflowRes.data ?? []) as any[]

  const orders = (ordersRes.data ?? []) as any[]

  const statusCounts: Record<string, number> = {}
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1

  const timeline: Record<string, number> = {}
  for (const o of orders) {
    const day = (o.created_at as string).slice(0, 10)
    timeline[day] = (timeline[day] ?? 0) + 1
  }

  const chartStatusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    Orders: count,
  }))

  const chartTimelineData = Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), Orders: count }))

  const periodLabel = PERIOD_LABELS[period] ?? '1 Month'

  const quickActions = [
    { label: 'Create Order',  sub: 'Submit a new testing order',    href: '/admin/orders/new', bg: 'bg-blue-600',   icon: Plus },
    { label: 'Manage Users',  sub: 'Add or edit system users',       href: '/admin/users',      bg: 'bg-green-600',  icon: Users },
    { label: 'View Reports',  sub: 'Access lab test reports',        href: '/admin/reports',    bg: 'bg-red-500',    icon: FileBarChart },
    { label: 'Settings',      sub: 'Configure system settings',      href: '/admin/settings',   bg: 'bg-yellow-500', icon: Settings },
  ]

  const statsCards = [
    { label: 'Orders',  value: orders.length,                       icon: ClipboardList, color: 'text-blue-500' },
    { label: 'Samples', value: (samplesRes.data ?? []).length,       icon: FlaskConical,  color: 'text-green-500' },
    { label: 'Tests',   value: (testsRes.data ?? []).length,         icon: TestTube,      color: 'text-yellow-500' },
    // The legacy `results` table was never written to, so this card always
    // read 0 — sample_tests is where results actually live.
    { label: 'Results', value: workflowRows.length,                  icon: BarChart3,     color: 'text-purple-500' },
  ]

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome {displayName}</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            This dashboard gives a clear overview of lab operations, track orders, samples, tests, and results at a glance.
            Clickable charts let you explore data, helping you monitor workflows and make informed decisions.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shrink-0 ml-4">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <Link
              key={key}
              href={`/admin/dashboard?period=${key}`}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                period === key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {quickActions.map(action => (
          <Link
            key={action.label}
            href={action.href}
            className={`${action.bg} hover:opacity-90 text-white rounded-lg p-6 flex flex-col items-center justify-center text-center gap-3 transition shadow-sm`}
          >
            <div className="bg-white/20 rounded-full p-3">
              <action.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">{action.label}</p>
              <p className="text-xs text-white/80 mt-0.5">{action.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statsCards.map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
            <div className="bg-gray-50 rounded-full p-3">
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow indicators */}
      <WorkflowIndicators rows={workflowRows} basePath="/admin" />

      {/* Charts */}
      <DashboardCharts
        statusData={chartStatusData}
        timelineData={chartTimelineData}
        periodLabel={periodLabel}
      />
    </div>
  )
}
