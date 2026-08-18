'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer,
} from 'recharts'

interface Props {
  statusData: { name: string; Orders: number }[]
  timelineData: { date: string; Orders: number }[]
  periodLabel: string
}

/* One measure, one series, one hue — so no legend is needed and the
   title names what is plotted. Grid and axes stay recessive; the marks
   carry the data. */
const BRAND = '#1a56db'
const GRID  = '#eceef2'
const AXIS  = '#98a2b3'

const AXIS_TICK = { fontSize: 11, fill: AXIS }

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 7,
  border: '1px solid #e6e8ec',
  boxShadow: '0 12px 28px -6px rgb(16 24 40 / 0.16)',
  padding: '6px 10px',
} as const

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-xs">
      <h3 className="mb-3 text-[13px] font-medium text-ink">{title}</h3>
      {children}
    </div>
  )
}

export default function DashboardCharts({ statusData, timelineData, periodLabel }: Props) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {statusData.length > 0 && (
        <ChartFrame title={`Orders by status · ${periodLabel}`}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={statusData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(26,86,219,0.05)' }} />
              {/* Thin bars, 4px rounded top anchored to the baseline. */}
              <Bar dataKey="Orders" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      )}

      {timelineData.length > 0 && (
        <ChartFrame title={`Orders received · ${periodLabel}`}>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={timelineData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: BRAND, strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Line
                type="monotone" dataKey="Orders" stroke={BRAND} strokeWidth={2}
                dot={{ r: 2.5, fill: BRAND, strokeWidth: 0 }}
                activeDot={{ r: 4.5, fill: BRAND, stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      )}
    </div>
  )
}
