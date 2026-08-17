import Link from 'next/link'
import { FileEdit, Undo2, ClipboardCheck, ShieldCheck, Send, AlertTriangle, Package } from 'lucide-react'
import { workflowState, isOverdue } from '@/lib/workflow'

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

  const cards = [
    { label: 'Awaiting entry',   value: count('awaiting_entry'),  icon: FileEdit,      color: 'text-slate-600 bg-slate-100',    href: `${basePath}/work-queue?status=pending` },
    { label: 'Returned',         value: count('returned'),        icon: Undo2,         color: 'text-red-600 bg-red-50',         href: `${basePath}/work-queue?status=returned` },
    { label: 'Awaiting review',  value: count('awaiting_review'), icon: ClipboardCheck,color: 'text-yellow-600 bg-yellow-50',   href: `${basePath}/work-queue?status=entered` },
    { label: 'In review',        value: count('in_review'),       icon: ShieldCheck,   color: 'text-blue-600 bg-blue-50',       href: `${basePath}/review-queue` },
    { label: 'Ready to release', value: count('approved'),        icon: Send,          color: 'text-emerald-600 bg-emerald-50', href: `${basePath}/work-queue?status=approved` },
    { label: 'Released',         value: count('released'),        icon: Package,       color: 'text-green-700 bg-green-50',     href: `${basePath}/work-queue?status=released` },
    { label: 'Overdue reviews',  value: overdueReviews,           icon: AlertTriangle, color: 'text-orange-600 bg-orange-50',   href: `${basePath}/review-queue` },
  ]

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Result workflow</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 hover:shadow transition"
          >
            <div className={`inline-flex p-1.5 rounded-lg mb-2 ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className={`text-2xl font-bold ${card.value > 0 ? 'text-slate-900' : 'text-slate-300'}`}>{card.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
