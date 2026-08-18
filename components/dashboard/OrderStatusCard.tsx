import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import Card from '@/components/dashboard/Card'

export interface StatusRow {
  key: string
  label: string
  count: number
  href: string
  /** Explains how the stage is derived, on hover. */
  basis: string
}

/* The five lifecycle stages, drawn as a descending flow:
   Received → In Progress → Review → Approved → Released.
   One hue deepening down the flow, so position is readable without
   learning a colour code, and every stage carries its own count,
   share and bar. */
const BAR = ['bg-brand-200', 'bg-brand-500', 'bg-brand-600', 'bg-brand-700', 'bg-brand-900']

export default function OrderStatusCard({
  rows, total, subtitle, href, cancelled = 0, cancelledHref,
}: {
  rows: StatusRow[]
  total: number
  subtitle?: string
  href?: string
  cancelled?: number
  cancelledHref?: string
}) {
  return (
    <Card title="Order status" subtitle={subtitle} actionHref={href} actionLabel="All orders">
      {total === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-4">No orders in the system yet.</p>
      ) : (
        <ol>
          {rows.map((r, i) => {
            const share = total > 0 ? (r.count / total) * 100 : 0
            return (
              <li key={r.key}>
                <Link href={r.href} title={r.basis} className="group block rounded-md px-1 py-1 transition-colors hover:bg-surface-muted">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12.5px] text-ink-2 group-hover:text-ink">{r.label}</span>
                    <span className="shrink-0 tabular text-[12px]">
                      <span className={cn('font-semibold', r.count === 0 ? 'text-ink-4' : 'text-ink')}>{r.count}</span>
                      <span className="ml-1.5 text-ink-4">{Math.round(share)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div className={cn('h-full rounded-full', BAR[i] ?? BAR[0])} style={{ width: `${share}%` }} />
                  </div>
                </Link>
                {i < rows.length - 1 && (
                  <div className="flex justify-center py-0.5" aria-hidden="true">
                    <ChevronDown className="h-3 w-3 text-ink-4/60" />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-2.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">Total orders</span>
        <span className="tabular text-[15px] font-semibold text-ink">{total}</span>
      </div>
      {cancelled > 0 && (
        <p className="mt-1.5 text-[11.5px] text-ink-4">
          {cancelledHref
            ? <Link href={cancelledHref} className="underline-offset-2 hover:text-ink-3 hover:underline">{cancelled} cancelled</Link>
            : `${cancelled} cancelled`}
          {' '}· excluded from the flow above
        </p>
      )}
    </Card>
  )
}
