import Link from 'next/link'
import { ArrowRight, PartyPopper } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, getPriorityLabel } from '@/lib/utils'
import { Badge, Mono, type Tone } from '@/components/ui/primitives'
import Card from '@/components/dashboard/Card'

export interface MyWorkRow {
  id: string
  orderNumber: string
  client: string
  status: string
  statusLabel: string
  statusTone: Tone
  priority: string
  dateDue: string | null
  overdue: boolean
  href: string
  /** Why this row is mine — assigned analyst, assigned reviewer, or both. */
  role: string
}

const PRIORITY_TONE: Record<string, Tone> = {
  normal: 'neutral', priority_48h: 'warn', priority_24h: 'warn', same_day: 'crit',
}

/**
 * The orders this user personally owns — either as the assigned analyst
 * or as the named reviewer on one of its results. Ordered by urgency:
 * overdue first, then due date, then priority.
 */
export default function MyWork({
  rows, href, limit = 6,
}: {
  rows: MyWorkRow[]
  href: string
  limit?: number
}) {
  const shown = rows.slice(0, limit)

  return (
    <Card
      title="My work"
      subtitle={rows.length === 0 ? 'Nothing assigned to you' : `${rows.length} order${rows.length === 1 ? '' : 's'} assigned to you`}
      actionHref={rows.length > 0 ? href : undefined}
      actionLabel="Open queue"
      padded={false}
    >
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <span className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-ok-bg">
            <PartyPopper className="h-4.5 w-4.5 text-ok-fg" />
          </span>
          <p className="text-[13px] font-medium text-ink">You&rsquo;re all caught up 🎉</p>
          <p className="mt-1 text-[12px] text-ink-3">No orders are currently assigned to you.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Priority', 'Order', 'Client', 'Status', 'Due', ''].map((h, i) => (
                  <th
                    key={h || i}
                    className={cn(
                      'border-b border-line bg-surface-muted px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3',
                      i === 5 ? 'text-right' : 'text-left',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.id} className={cn('fq-row-hover transition-colors', r.overdue && 'bg-crit-bg/40')}>
                  <td className="border-b border-line px-3 py-2 align-middle">
                    {r.priority === 'normal'
                      ? <span className="text-[11.5px] text-ink-4">Normal</span>
                      : <Badge tone={PRIORITY_TONE[r.priority] ?? 'neutral'} dot>{getPriorityLabel(r.priority)}</Badge>}
                  </td>
                  <td className="border-b border-line px-3 py-2 align-middle">
                    <Link href={r.href} className="font-medium text-brand-600 hover:text-brand-700">
                      <Mono>{r.orderNumber}</Mono>
                    </Link>
                    <span className="ml-1.5 text-[11px] text-ink-4">{r.role}</span>
                  </td>
                  <td className="border-b border-line px-3 py-2 align-middle">
                    <span className="block max-w-[180px] truncate text-ink-2">{r.client}</span>
                  </td>
                  <td className="border-b border-line px-3 py-2 align-middle">
                    <Badge tone={r.statusTone} dot>{r.statusLabel}</Badge>
                  </td>
                  <td className="border-b border-line px-3 py-2 align-middle whitespace-nowrap tabular">
                    <span className={r.overdue ? 'font-medium text-crit-fg' : 'text-ink-2'}>
                      {formatDate(r.dateDue)}
                    </span>
                    {r.overdue && <span className="ml-1 text-[11px] font-medium text-crit-fg">overdue</span>}
                  </td>
                  <td className="border-b border-line px-3 py-2 text-right align-middle">
                    <Link href={r.href} className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > shown.length && (
            <div className="border-t border-line px-4 py-2 text-center">
              <Link href={href} className="text-[12px] font-medium text-brand-600 hover:text-brand-700">
                {rows.length - shown.length} more assigned to you →
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
