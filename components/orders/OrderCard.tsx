import Link from 'next/link'
import { AlertTriangle, ArrowRight, Building2, FlaskConical } from 'lucide-react'
import { formatDate, getPriorityLabel } from '@/lib/utils'
import { personName } from '@/lib/workflow'
import { Badge, Mono, type Tone } from '@/components/ui/primitives'
import { ProgressCell } from '@/components/ui/metrics'
import { cn } from '@/lib/utils'

export interface OrderCardData {
  id: string
  order_number: string
  status: string
  priority: string
  date_due: string | null
  clients?: { client_name?: string | null } | null
  profiles?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
  samples?: { id: string; sample_tests?: { id: string; status: string }[] }[] | null
}

const PRIORITY_TONE: Record<string, Tone> = {
  normal: 'neutral', priority_48h: 'warn', priority_24h: 'warn', same_day: 'crit',
}

/**
 * An order rendered as a card. Used when a filtered list holds only a
 * few records — a lone table row stranded above an empty screen reads
 * as a broken page, where a card does not.
 */
export default function OrderCard({
  order, statusLabel, statusTone, overdue, basePath = '/admin/orders',
}: {
  order: OrderCardData
  statusLabel: string
  statusTone: Tone
  overdue: boolean
  basePath?: string
}) {
  const samples = order.samples ?? []
  const tests = samples.flatMap(s => s.sample_tests ?? [])
  const approved = tests.filter(t => t.status === 'approved').length

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border bg-surface shadow-xs transition-all hover:-translate-y-px hover:shadow-sm',
        overdue ? 'border-crit-line' : 'border-line hover:border-line-strong',
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <Link href={`${basePath}/${order.id}`} className="font-semibold text-brand-600 hover:text-brand-700">
            <Mono className="text-[13px]">{order.order_number}</Mono>
          </Link>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-ink-2">
            <Building2 className="h-3 w-3 shrink-0 text-ink-4" />
            {order.clients?.client_name ?? '—'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={statusTone} dot>{statusLabel}</Badge>
          {order.priority !== 'normal' && (
            <Badge tone={PRIORITY_TONE[order.priority] ?? 'neutral'} dot>
              {getPriorityLabel(order.priority)}
            </Badge>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 px-4 py-3">
        <div className="min-w-0">
          <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">Samples</dt>
          <dd className="mt-1 flex items-center gap-1 tabular text-[15px] font-semibold text-ink">
            <FlaskConical className="h-3.5 w-3.5 text-ink-4" />
            {samples.length}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">Progress</dt>
          <dd className="mt-1">
            {tests.length > 0
              ? <ProgressCell done={approved} total={tests.length} />
              : <span className="text-[12px] text-ink-4">No tests</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">Due</dt>
          <dd className={cn('mt-1 tabular text-[13px]', overdue ? 'font-semibold text-crit-fg' : 'text-ink')}>
            {formatDate(order.date_due)}
            {overdue && (
              <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-crit-fg">
                <AlertTriangle className="h-3 w-3" /> overdue
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between border-t border-line px-4 py-2">
        <span className="truncate text-[11.5px] text-ink-3">
          {order.profiles ? personName(order.profiles) : <span className="text-ink-4">Unassigned</span>}
        </span>
        <Link
          href={`${basePath}/${order.id}`}
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700"
        >
          Open order <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
