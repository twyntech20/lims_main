import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, type Tone } from '@/components/ui/primitives'

/* ============================================================
   Operational metric displays.
   A count is a headline number, not a chart — these are stat
   tiles, deliberately. Colour is reserved for the one state that
   needs attention; everything else stays in ink.
   ============================================================ */

export function StatTile({
  label, value, hint, href, icon: Icon, tone = 'neutral', emphasis = false,
}: {
  label: string
  value: number | string
  hint?: string
  href?: string
  icon?: React.ElementType
  /** Only set when the number itself is a problem (overdue, returned). */
  tone?: Tone
  emphasis?: boolean
}) {
  const alert = tone !== 'neutral' && Number(value) > 0

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">{label}</span>
        {Icon && <Icon className={cn('h-3.5 w-3.5 shrink-0', alert ? 'text-crit-fg' : 'text-ink-4')} />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={cn(
            'tabular text-[26px] font-semibold leading-none tracking-[-0.02em]',
            value === 0 ? 'text-ink-4' : alert ? 'text-crit-fg' : 'text-ink',
          )}
        >
          {value}
        </span>
        {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
      </div>
    </>
  )

  const shell = cn(
    'rounded-lg border bg-surface px-3.5 py-3 shadow-xs transition-colors',
    alert ? 'border-crit-line' : 'border-line',
    emphasis && 'ring-1 ring-brand-100',
    href && 'hover:border-line-strong hover:bg-surface-muted',
  )

  return href ? <Link href={href} className={cn(shell, 'block')}>{body}</Link> : <div className={shell}>{body}</div>
}

/**
 * The order lifecycle as a left-to-right pipeline.
 * Stages use one hue deepening along the flow — a progression, not a
 * set of unrelated categories — and every stage is labelled.
 */
export function Pipeline({
  stages,
}: {
  stages: { key: string; label: string; count: number; href?: string }[]
}) {
  const total = stages.reduce((sum, s) => sum + s.count, 0)

  // One hue, light -> dark, so position in the flow is legible without
  // relying on colour identity.
  const FILL = [
    'bg-brand-50 border-brand-100',
    'bg-brand-100 border-brand-200',
    'bg-brand-200 border-brand-500/40',
    'bg-brand-500/25 border-brand-500/50',
    'bg-brand-600/25 border-brand-600/50',
  ]

  return (
    <div className="rounded-lg border border-line bg-surface p-3 shadow-xs">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch sm:gap-0">
        {stages.map((s, i) => {
          const share = total > 0 ? Math.round((s.count / total) * 100) : 0
          const inner = (
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-2">{s.label}</span>
                <span className="tabular text-[11px] text-ink-4">{share}%</span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className={cn('tabular text-[22px] font-semibold leading-none', s.count === 0 ? 'text-ink-4' : 'text-ink')}>
                  {s.count}
                </span>
              </div>
              {/* Magnitude bar: 2px gap from the tile edge, flat ends on
                  the baseline, no gradient. */}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${share}%` }} />
              </div>
            </div>
          )

          const tile = (
            <div className={cn('h-full rounded-md border px-3 py-2.5 transition-colors', FILL[i] ?? FILL[0],
                                s.href && 'hover:brightness-[0.985]')}>
              {inner}
            </div>
          )

          return (
            <div key={s.key} className="flex min-w-0 flex-1 items-stretch">
              <div className="min-w-0 flex-1">
                {s.href ? <Link href={s.href} className="block h-full">{tile}</Link> : tile}
              </div>
              {i < stages.length - 1 && (
                <div className="hidden shrink-0 items-center px-1 sm:flex" aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5 text-ink-4" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** A single actionable line in the "My work" list. */
export function WorkItem({
  label, count, href, tone = 'neutral', description,
}: {
  label: string
  count: number
  href: string
  tone?: Tone
  description?: string
}) {
  const idle = count === 0
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5 last:border-b-0 transition-colors',
        idle ? 'hover:bg-surface-muted' : 'hover:bg-surface-muted',
      )}
    >
      <div className="min-w-0">
        <span className={cn('text-[13px] font-medium', idle ? 'text-ink-3' : 'text-ink')}>{label}</span>
        {description && <p className="mt-0.5 text-[12px] text-ink-3">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {idle ? (
          <span className="tabular text-[13px] text-ink-4">0</span>
        ) : (
          <Badge tone={tone} dot={tone !== 'neutral'}>
            <span className="tabular">{count}</span>
          </Badge>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-ink-4" />
      </div>
    </Link>
  )
}

/**
 * Order lifecycle as a vertical timeline. A stage is `done` when its
 * fact exists (a timestamp, a state reached), `current` for the stage
 * the order sits in now, and pending otherwise — so completion is
 * conveyed by position and icon, not by colour alone.
 */
export function Timeline({
  steps,
}: {
  steps: { label: string; at?: string | null; by?: string | null; done: boolean; current?: boolean; note?: string }[]
}) {
  return (
    <ol className="relative">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
          {/* Connector */}
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn('absolute left-[7px] top-4 h-full w-px', s.done ? 'bg-brand-200' : 'bg-line')}
            />
          )}
          <span
            className={cn(
              'relative z-10 mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 bg-surface',
              s.done ? 'border-brand-600' : s.current ? 'border-brand-600' : 'border-line-strong',
            )}
          >
            {s.done && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
            {!s.done && s.current && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-600" />}
          </span>
          <div className="min-w-0 flex-1 -mt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className={cn('text-[13px]', s.done || s.current ? 'font-medium text-ink' : 'text-ink-4')}>
                {s.label}
              </span>
              {s.at && (
                <span className="tabular text-[11px] text-ink-4">
                  {new Date(s.at).toLocaleString('en-AU', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            {(s.by || s.note) && (
              <p className="mt-0.5 text-[12px] text-ink-3">{[s.by, s.note].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Compact completion meter for a table cell: "4 / 7 approved". */
export function ProgressCell({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="min-w-[92px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="tabular text-[12px] font-medium text-ink">{done}/{total}</span>
        <span className="tabular text-[11px] text-ink-4">{pct}%</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className={cn('h-full rounded-full', pct === 100 ? 'bg-ok-fg' : 'bg-brand-600')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
