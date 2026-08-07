'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function PriorityFilter({ current }: { current?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) params.set('priority', e.target.value)
    else params.delete('priority')
    router.push(`/admin/orders?${params.toString()}`)
  }

  return (
    <select
      defaultValue={current ?? ''}
      onChange={handleChange}
      className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">All Priorities</option>
      <option value="same_day">Same Day</option>
      <option value="priority_24h">24 Hour</option>
      <option value="priority_48h">48 Hour</option>
      <option value="normal">Normal</option>
    </select>
  )
}
