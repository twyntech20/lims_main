import { FileEdit, Undo2, ClipboardCheck, ShieldCheck, Send, AlertTriangle, Package } from 'lucide-react'
import { workflowState, isOverdue } from '@/lib/workflow'
import { StatTile } from '@/components/ui/metrics'
import { Section } from '@/components/ui/primitives'

export interface IndicatorRow {
  status: string
  returned_at: string | null
  assigned_reviewer_id: string | null
  entered_at?: string | null
  samples: { orders: { date_due: string | null; released_at: string | null } | null } | null
}

/**
 * Workflow indicators computed from the result rows themselves — every
 * number here is a count of sample_tests in a derived workflow state, so
 * there is nothing stored that could drift out of sync.
 */
export default function WorkflowIndicators({
  rows,
  basePath,
}: {
  rows: IndicatorRow[]
  basePath: '/admin' | '/analyst'
}) {
  const states = rows.map(r => ({
    state: workflowState({
      status: r.status,
      returned_at: r.returned_at,
      assigned_reviewer_id: r.assigned_reviewer_id,
      order_released_at: r.samples?.orders?.released_at,
    }),
    overdue: isOverdue(r.samples?.orders?.date_due),
  }))

  const count = (s: string) => states.filter(x => x.state === s).length
  const overdueReviews = states.filter(x => x.state === 'in_review' && x.overdue).length

  const tiles = [
    { label: 'Awaiting entry',  value: count('awaiting_entry'),  icon: FileEdit,      href: `${basePath}/work-queue?status=pending` },
    { label: 'Returned',        value: count('returned'),        icon: Undo2,         href: `${basePath}/work-queue?status=returned`,  tone: 'crit' as const },
    { label: 'Awaiting review', value: count('awaiting_review'), icon: ClipboardCheck,href: `${basePath}/work-queue?status=entered` },
    { label: 'In review',       value: count('in_review'),       icon: ShieldCheck,   href: `${basePath}/review-queue` },
    { label: 'Ready to release',value: count('approved'),        icon: Send,          href: `${basePath}/work-queue?status=approved` },
    { label: 'Released',        value: count('released'),        icon: Package,       href: `${basePath}/work-queue?status=released` },
    { label: 'Overdue reviews', value: overdueReviews,           icon: AlertTriangle, href: `${basePath}/review-queue`, tone: 'crit' as const },
  ]

  return (
    <Section title="Result workflow">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
        {tiles.map(t => (
          <StatTile
            key={t.label}
            label={t.label}
            value={t.value}
            icon={t.icon}
            href={t.href}
            tone={t.tone ?? 'neutral'}
          />
        ))}
      </div>
    </Section>
  )
}
