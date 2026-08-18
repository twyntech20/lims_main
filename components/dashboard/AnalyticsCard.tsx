'use client'

import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'

/* Distribution charts for the bottom analytics row. One card, one
   question. A card is only mounted by the page when its dataset is
   non-empty, so there are no empty chart frames. */

const GRID = '#eceef2'
const AXIS = '#98a2b3'
const AXIS_TICK = { fontSize: 10.5, fill: AXIS }

/* Sequential single-hue ramp — categories are ordered, not competing. */
const RAMP = ['#1a56db', '#3b74ee', '#6d97f4', '#9db9f8', '#bcd0ff', '#dbe6ff']

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e6e8ec',
  boxShadow: '0 12px 28px -6px rgb(16 24 40 / 0.16)',
  padding: '6px 10px',
} as const

export interface Slice { name: string; value: number }

export default function AnalyticsCard({
  title, subtitle, kind, data, height = 200, valueLabel = 'Count',
}: {
  title: string
  subtitle?: string
  kind: 'column' | 'bar' | 'donut'
  data: Slice[]
  height?: number
  valueLabel?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <section className="flex flex-col rounded-lg border border-line bg-surface shadow-xs">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11.5px] text-ink-4">{subtitle}</p>}
      </div>
      <div className="p-3">
        {kind === 'donut' ? (
          <div className="flex items-center gap-3">
            <ResponsiveContainer width="45%" height={height}>
              <PieChart>
                <Pie
                  data={data} dataKey="value" nameKey="name"
                  innerRadius="58%" outerRadius="88%" paddingAngle={1.5} stroke="#fff" strokeWidth={2}
                >
                  {data.map((_, i) => <Cell key={i} fill={RAMP[i % RAMP.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v as number, valueLabel]} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {data.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: RAMP[i % RAMP.length] }} />
                  <span className="min-w-0 flex-1 truncate text-ink-2">{d.name}</span>
                  <span className="shrink-0 tabular font-medium text-ink">{d.value}</span>
                  <span className="w-9 shrink-0 text-right tabular text-ink-4">
                    {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : kind === 'bar' ? (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ top: 2, right: 12, left: 6, bottom: 2 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                type="category" dataKey="name" tick={AXIS_TICK} tickLine={false}
                axisLine={{ stroke: GRID }} width={110}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(26,86,219,0.05)' }} />
              <Bar dataKey="value" name={valueLabel} fill={RAMP[0]} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 4, right: 6, left: -24, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={38} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(26,86,219,0.05)' }} />
              <Bar dataKey="value" name={valueLabel} fill={RAMP[0]} radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
