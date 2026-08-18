import Link from 'next/link'
import { CalendarRange, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PERIOD_OPTIONS, periodHref, type Period } from '@/lib/dashboard/metrics'
import { FIELD, buttonClass } from '@/components/ui/primitives'

/**
 * Segmented range control. The presets are plain links so filtering
 * stays server-side; the custom range is a native GET form inside a
 * <details> disclosure, so the control needs no client JavaScript.
 */
export default function DateRangeFilter({
  period, basePath,
}: {
  period: Period
  basePath: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center rounded-lg border border-line bg-surface p-0.5 shadow-xs">
        {PERIOD_OPTIONS.map(opt => {
          const active = period.key === opt.key
          return (
            <Link
              key={opt.key}
              href={periodHref(basePath, period, opt.key)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
                active ? 'bg-brand-600 text-white shadow-xs' : 'text-ink-3 hover:bg-surface-sunken hover:text-ink',
              )}
            >
              {opt.label}
            </Link>
          )
        })}

        <details className="relative">
          <summary
            className={cn(
              'flex cursor-pointer list-none items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
              period.key === 'custom' ? 'bg-brand-600 text-white shadow-xs' : 'text-ink-3 hover:bg-surface-sunken hover:text-ink',
            )}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            Custom
          </summary>

          <form
            action={basePath}
            method="get"
            className="absolute right-0 z-30 mt-2 w-[248px] rounded-lg border border-line bg-surface p-3 shadow-pop"
          >
            <input type="hidden" name="period" value="custom" />
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Custom range</p>
            <label className="mb-2 block">
              <span className="mb-1 block text-[12px] text-ink-2">From</span>
              <input type="date" name="from" defaultValue={period.customFrom} required className={cn(FIELD, 'w-full')} />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-[12px] text-ink-2">To</span>
              <input type="date" name="to" defaultValue={period.customTo} required className={cn(FIELD, 'w-full')} />
            </label>
            <button type="submit" className={buttonClass('primary', 'sm', 'w-full')}>
              <Check className="h-3 w-3" /> Apply range
            </button>
          </form>
        </details>
      </div>
    </div>
  )
}
