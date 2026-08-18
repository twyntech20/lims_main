import { cn } from '@/lib/utils'

/* A sparkline is a word-sized graphic, not a chart: no axes, no grid,
   no tooltip. It renders as inline SVG so it costs nothing on the
   client and stays crisp at any card width. */

const STROKE: Record<string, string> = {
  brand: 'var(--color-brand-600)',
  ok:    'var(--color-ok-fg)',
  warn:  'var(--color-warn-fg)',
  crit:  'var(--color-crit-fg)',
  ink:   'var(--color-ink-3)',
}

export default function MiniSparkline({
  data, tone = 'brand', height = 30, className, label,
}: {
  data: number[]
  tone?: keyof typeof STROKE
  height?: number
  className?: string
  /** Screen-reader description — the graphic itself is decorative. */
  label?: string
}) {
  // Two points is the minimum that can describe a direction.
  if (!data || data.length < 2) return null

  const W = 100
  const H = height
  const pad = 2
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const x = (i: number) => (i / (data.length - 1)) * W
  const y = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2)

  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const stroke = STROKE[tone] ?? STROKE.brand
  const gradientId = `spark-${tone}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn('block w-full', className)}
      style={{ height: H }}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
