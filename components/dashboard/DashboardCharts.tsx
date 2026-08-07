'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer
} from 'recharts'
import { Inbox } from 'lucide-react'

interface Props {
  statusData: { name: string; Orders: number }[]
  timelineData: { date: string; Orders: number }[]
  periodLabel: string
}

export default function DashboardCharts({ statusData, timelineData, periodLabel }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Status distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">Order Status Distribution ({periodLabel})</h2>
        {statusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Orders" fill="#4f9cf9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="No order data for the selected time period" />
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">Order Timeline ({periodLabel})</h2>
        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Orders" stroke="#4f9cf9" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="No order activity for the selected time period" />
        )}
      </div>
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-gray-300">
      <Inbox className="w-12 h-12 mb-3" />
      <p className="text-sm text-gray-400 font-medium">No Order Timeline</p>
      <p className="text-xs text-gray-300 mt-1">{label}</p>
    </div>
  )
}
