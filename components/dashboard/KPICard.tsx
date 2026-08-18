import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import MiniSparkline from '@/components/dashboard/MiniSparkline'
import type { Trend } from '@/lib/dashboard/metrics'

/* Headline number, its movement against the previous window of the
   same length, and the daily shape behind it. Every element is
   optional: when a figure cannot be derived from stored data the card
   says so instead of showing a placeholder number. */

export default function KPICard({
  label, value, unit, hint, icon: Icon, href, trend, series, seriesTone = 'brand',
  goodWhen = 'up', note,
}: {
  label: string
  value: number | string
  unit?: string
  hint?: string
  icon: React.ElementType
  href?: string
  trend?: Trend | null
  series?: number[] | null
  seriesTone?: 'brand' | 'ok' | 'warn' | 'crit' | 'ink'
  /** Which direction counts as an improvement for this measure. */
  goodWhen?: 'up' | 'down'
  /** Shown in place of a trend when the metric is not comparable. */
  note?: string
}) {
  const good = trend && trend.direction !== 'flat' && trend.direction === goodWhen
  const bad = trend && trend.direction !== 'flat' && trend.direction !== goodWhen

  const TrendIcon = trend?.direction === 'up' ? ArrowUpRight
    : trend?.direction === 'down' ? ArrowDownRight
    : Minus

  const body = (
    <>
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">{label}</span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50">
          <Icon className="h-3.5 w-3.5 text-brand-600" />
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 px-4 pt-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'tabular text-[28px] font-semibold leading-none tracking-[-0.025em]',
                value === 0 || value === '—' ? 'text-ink-4' : 'text-ink',
              )}
            >
              {value}
            </span>
            {unit && <span className="text-[13px] font-medium text-ink-3">{unit}</span>}
          </div>
          {hint && <p className="mt-1.5 truncate text-[11.5px] text-ink-4">{hint}</p>}
        </div>

        {trend ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular',
              good ? 'border-ok-line bg-ok-bg text-ok-fg'
                : bad ? 'border-crit-line bg-crit-bg text-crit-fg'
                : 'border-line bg-surface-sunken text-ink-3',
            )}
            title={`Previous period: ${trend.previous}`}
          >
            <TrendIcon className="h-3 w-3" />
            {trend.pct === null
              ? (trend.direction === 'flat' ? '0%' : 'new')
              : `${Math.abs(trend.pct) >= 999 ? '999+' : Math.abs(trend.pct).toFixed(Math.abs(trend.pct) < 10 ? 1 : 0)}%`}
          </span>
        ) : note ? (
          <span className="shrink-0 text-right text-[11px] leading-tight text-ink-4">{note}</span>
        ) : null}
      </div>

      <div className="mt-2.5">
        {series && series.length >= 2
          ? <MiniSparkline data={series} tone={seriesTone} height={32} />
          : <div className="h-[32px]" />}
      </div>
    </>
  )

  const shell = cn(
    'group relative overflow-hidden rounded-lg border border-line bg-surface pb-0 shadow-xs transition-all',
    href && 'hover:-translate-y-px hover:border-line-strong hover:shadow-sm',
  )

  return href ? <Link href={href} className={cn(shell, 'block')}>{body}</Link> : <div className={shell}>{body}</div>
}
