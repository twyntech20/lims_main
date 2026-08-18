// ============================================================
// Dashboard metrics — pure date/number helpers.
//
// No data access and no invented figures live here: every function
// takes facts that already exist in the database (timestamps, counts)
// and reshapes them for display. Where a metric cannot be derived
// from the stored facts the helpers return `null` so the UI can say
// so, rather than substituting a plausible number.
// ============================================================

export type PeriodKey = 'today' | '7d' | '30d' | '90d' | 'custom'

export interface Period {
  key: PeriodKey
  /** Short label for the segmented control. */
  label: string
  /** Sentence form, used in card subtitles ("in the last 30 days"). */
  phrase: string
  /** Inclusive start. */
  from: Date
  /** Exclusive end. */
  to: Date
  /** The immediately preceding window of identical length. */
  prevFrom: Date
  prevTo: Date
  /** Day buckets covered by [from, to). */
  buckets: string[]
  /** Echoed back into the custom-range form. */
  customFrom?: string
  customTo?: string
}

const DAY = 86_400_000

/** Local-time day key. Used for both bucket generation and bucketing. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseDateInput(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const parsed = new Date(y, m - 1, d)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function buildBuckets(from: Date, to: Date): string[] {
  const out: string[] = []
  // Cap the axis so a multi-year custom range cannot render thousands of
  // points; the KPI totals stay exact either way.
  const cursor = startOfDay(from)
  const end = to.getTime()
  for (let i = 0; cursor.getTime() < end && i < 400; i++) {
    out.push(dayKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export const PERIOD_OPTIONS: { key: Exclude<PeriodKey, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d',    label: '7 days' },
  { key: '30d',   label: '30 days' },
  { key: '90d',   label: '90 days' },
]

/**
 * Turns the URL params into a concrete window plus the equivalent
 * preceding window, so a period-over-period comparison is a subtraction
 * rather than a guess.
 */
export function resolvePeriod(
  params: { period?: string; from?: string; to?: string },
  now: Date = new Date(),
): Period {
  const today = startOfDay(now)
  const tomorrow = new Date(today.getTime() + DAY)

  const customFrom = parseDateInput(params.from)
  const customTo = parseDateInput(params.to)

  if (params.period === 'custom' && customFrom && customTo && customTo >= customFrom) {
    const from = customFrom
    const to = new Date(customTo.getTime() + DAY) // inclusive end date
    const span = to.getTime() - from.getTime()
    return {
      key: 'custom',
      label: 'Custom',
      phrase: `${params.from} → ${params.to}`,
      from,
      to,
      prevFrom: new Date(from.getTime() - span),
      prevTo: from,
      buckets: buildBuckets(from, to),
      customFrom: params.from,
      customTo: params.to,
    }
  }

  const spanDays = params.period === 'today' ? 1 : params.period === '7d' ? 7 : params.period === '90d' ? 90 : 30
  const key: PeriodKey = params.period === 'today' ? 'today'
    : params.period === '7d' ? '7d'
    : params.period === '90d' ? '90d'
    : '30d'

  const from = new Date(tomorrow.getTime() - spanDays * DAY)
  const to = tomorrow
  const span = spanDays * DAY

  return {
    key,
    label: PERIOD_OPTIONS.find(o => o.key === key)!.label,
    phrase: key === 'today' ? 'today' : `in the last ${spanDays} days`,
    from,
    to,
    prevFrom: new Date(from.getTime() - span),
    prevTo: from,
    buckets: buildBuckets(from, to),
  }
}

/** Rebuilds the dashboard URL, keeping a custom range intact. */
export function periodHref(base: string, period: Period, key: PeriodKey): string {
  if (key === 'custom' && period.customFrom && period.customTo) {
    return `${base}?period=custom&from=${period.customFrom}&to=${period.customTo}`
  }
  return `${base}?period=${key}`
}

// ── Windowing ───────────────────────────────────────────────

export function within(ts: string | null | undefined, from: Date, to: Date): boolean {
  if (!ts) return false
  const t = new Date(ts).getTime()
  return t >= from.getTime() && t < to.getTime()
}

/** Daily counts aligned to `buckets` — the shape a sparkline needs. */
export function countByDay(timestamps: (string | null | undefined)[], buckets: string[]): number[] {
  const tally = new Map<string, number>()
  for (const ts of timestamps) {
    if (!ts) continue
    const k = dayKey(new Date(ts))
    tally.set(k, (tally.get(k) ?? 0) + 1)
  }
  return buckets.map(b => tally.get(b) ?? 0)
}

// ── Trend ───────────────────────────────────────────────────

export interface Trend {
  /** Percentage change, or null when the previous window was empty. */
  pct: number | null
  direction: 'up' | 'down' | 'flat'
  previous: number
}

export function trend(current: number, previous: number): Trend {
  const direction = current > previous ? 'up' : current < previous ? 'down' : 'flat'
  if (previous === 0) return { pct: null, direction, previous }
  return { pct: ((current - previous) / previous) * 100, direction, previous }
}

// ── Durations ───────────────────────────────────────────────

/** Mean gap in hours between two timestamps, or null when no pair qualifies. */
export function meanHours(pairs: { start?: string | null; end?: string | null }[]): number | null {
  const spans: number[] = []
  for (const p of pairs) {
    if (!p.start || !p.end) continue
    const ms = new Date(p.end).getTime() - new Date(p.start).getTime()
    if (ms >= 0) spans.push(ms / 3_600_000)
  }
  if (spans.length === 0) return null
  return spans.reduce((a, b) => a + b, 0) / spans.length
}

export function formatHours(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)}h`
  return `${(hours / 24).toFixed(1)}d`
}

/** Share as a whole percent, or null when the denominator is zero. */
export function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null
  return (numerator / denominator) * 100
}

export function formatRate(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`
}
