'use client'

import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

/* Volume over time. Two series only — what came in, and what the lab
   signed off — so the gap between them is the backlog, readable at a
   glance. Grid and axes stay recessive; the areas carry the data. */

const BRAND = '#1a56db'
const ACCENT = '#98a2b3'
const GRID = '#eceef2'
const AXIS = '#98a2b3'

const AXIS_TICK = { fontSize: 10.5, fill: AXIS }

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e6e8ec',
  boxShadow: '0 12px 28px -6px rgb(16 24 40 / 0.16)',
  padding: '6px 10px',
} as const

export interface ActivityPoint {
  label: string
  Orders: number
  Approved: number
}

export default function OrderActivityChart({
  data, height = 240,
}: {
  data: ActivityPoint[]
  height?: number
}) {
  // A single day cannot describe a trend; a bar-like single point is
  // still more honest than a flat line drawn through one value.
  const interval = data.length > 40 ? Math.ceil(data.length / 12) : data.length > 14 ? 2 : 0

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="fqOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fqApproved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={interval}
          minTickGap={8}
        />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={38} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: BRAND, strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        <Area
          type="monotone" dataKey="Orders" stroke={BRAND} strokeWidth={2}
          fill="url(#fqOrders)" dot={false}
          activeDot={{ r: 4, fill: BRAND, stroke: '#fff', strokeWidth: 2 }}
        />
        <Area
          type="monotone" dataKey="Approved" stroke={ACCENT} strokeWidth={1.75}
          strokeDasharray="4 3" fill="url(#fqApproved)" dot={false}
          activeDot={{ r: 4, fill: ACCENT, stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
