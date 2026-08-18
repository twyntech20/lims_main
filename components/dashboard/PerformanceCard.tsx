import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Card from '@/components/dashboard/Card'

export interface PerformanceMetric {
  label: string
  value: string
  /** 0–100 when the measure is a rate; omitted for counts and durations. */
  percent?: number | null
  /** How the number was derived — on hover, so nothing is a black box. */
  basis: string
  /** Replaces the meter when the measure is not derivable from stored data. */
  unavailable?: string
  tone?: 'brand' | 'ok' | 'warn'
}

const METER: Record<string, string> = {
  brand: 'bg-brand-600',
  ok:    'bg-ok-fg',
  warn:  'bg-warn-fg',
}

/**
 * Laboratory performance as a 2×2 block of compact metric tiles.
 * Every figure is computed from timestamps the workflow already writes
 * (entered_at, approved_at, returned_at, released_at, date_due). Where
 * the underlying events have not happened the tile reads "—" and says why.
 */
export default function PerformanceCard({
  metrics, subtitle,
}: {
  metrics: PerformanceMetric[]
  subtitle?: string
}) {
  return (
    <Card title="Laboratory performance" subtitle={subtitle} padded={false}>
      <div className="grid grid-cols-2">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={cn(
              'px-4 py-3',
              i % 2 === 0 && 'border-r border-line',
              i < metrics.length - 2 && 'border-b border-line',
            )}
          >
            <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
              <span className="truncate">{m.label}</span>
              <span title={m.basis} className="shrink-0 cursor-help">
                <HelpCircle className="h-3 w-3 text-ink-4" />
              </span>
            </span>

            <p className={cn(
              'mt-1.5 tabular text-[21px] font-semibold leading-none tracking-[-0.02em]',
              m.value === '—' ? 'text-ink-4' : 'text-ink',
            )}>
              {m.value}
            </p>

            {m.percent !== undefined && m.percent !== null ? (
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className={cn('h-full rounded-full', METER[m.tone ?? 'brand'])}
                  style={{ width: `${Math.min(100, Math.max(0, m.percent))}%` }}
                />
              </div>
            ) : m.unavailable ? (
              <p className="mt-1.5 text-[11px] leading-snug text-ink-4">{m.unavailable}</p>
            ) : (
              <div className="mt-2 h-1" />
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
