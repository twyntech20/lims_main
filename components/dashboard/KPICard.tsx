import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Trend } from '@/lib/dashboard/metrics'

/* ============================================================
   KPI card.

   One headline number per card, read at a glance. Colour is an
   accent only — a rail down the edge and a tinted icon tile — so
   the four measures are distinguishable without the card itself
   becoming a coloured block, and the number always stays in ink.
   No chart lives in here: a KPI answers "how many", and the shape
   over time belongs to the Order Activity chart below.
   ============================================================ */

export type Accent = 'brand' | 'ok' | 'warn' | 'review' | 'info'

const RAIL: Record<Accent, string> = {
  brand:  'bg-brand-600',
  ok:     'bg-ok-fg',
  warn:   'bg-warn-fg',
  review: 'bg-review-fg',
  info:   'bg-info-fg',
}

const TILE: Record<Accent, string> = {
  brand:  'bg-brand-50 text-brand-600',
  ok:     'bg-ok-bg text-ok-fg',
  warn:   'bg-warn-bg text-warn-fg',
  review: 'bg-review-bg text-review-fg',
  info:   'bg-info-bg text-info-fg',
}

export default function KPICard({
  label, value, unit, hint, note, icon: Icon, href, trend, accent = 'brand', goodWhen = 'up',
}: {
  label: string
  value: number | string
  unit?: string
  /** One short supporting line under the number. */
  hint?: string
  /** Second line, for when the measure cannot be derived from stored data. */
  note?: string
  icon: React.ElementType
  href?: string
  trend?: Trend | null
  accent?: Accent
  /** Which direction counts as an improvement for this measure. */
  goodWhen?: 'up' | 'down'
}) {
  const good = trend && trend.direction !== 'flat' && trend.direction === goodWhen
  const bad = trend && trend.direction !== 'flat' && trend.direction !== goodWhen

  const TrendIcon = trend?.direction === 'up' ? ArrowUpRight
    : trend?.direction === 'down' ? ArrowDownRight
    : Minus

  const body = (
    <>
      {/* Accent rail — the only place the card carries its colour. */}
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px]', RAIL[accent])} />

      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">{label}</span>
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', TILE[accent])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn(
            'tabular text-[30px] font-semibold leading-none tracking-[-0.03em]',
            value === 0 || value === '—' ? 'text-ink-4' : 'text-ink',
          )}
        >
          {value}
        </span>
        {unit && <span className="text-[13px] font-medium text-ink-3">{unit}</span>}

        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular',
              good ? 'border-ok-line bg-ok-bg text-ok-fg'
                : bad ? 'border-crit-line bg-crit-bg text-crit-fg'
                : 'border-line bg-surface-sunken text-ink-3',
            )}
            title={`Previous period: ${trend.previous}`}
          >
            <TrendIcon className="h-3 w-3" />
            {/* Flat reads "0%", never "0.0%"; a rise from an empty
                previous period has no percentage, so it reads "new". */}
            {trend.direction === 'flat'
              ? '0%'
              : trend.pct === null
                ? 'new'
                : `${Math.abs(trend.pct) >= 999 ? '999+' : Math.abs(trend.pct).toFixed(Math.abs(trend.pct) < 10 ? 1 : 0)}%`}
          </span>
        )}
      </div>

      {hint && <p className="mt-2 text-[12px] leading-snug text-ink-3">{hint}</p>}
      {note && <p className="mt-0.5 text-[11.5px] leading-snug text-ink-4">{note}</p>}
    </>
  )

  const shell = cn(
    'relative overflow-hidden rounded-lg border border-line bg-surface px-4 py-3.5 shadow-xs transition-all',
    href && 'hover:-translate-y-px hover:border-line-strong hover:shadow-sm',
  )

  return href ? <Link href={href} className={cn(shell, 'block')}>{body}</Link> : <div className={shell}>{body}</div>
}
