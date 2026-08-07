'use client'

import { useTransition, useState } from 'react'
import { assignAnalyst } from '@/app/actions/orders'
import { Loader2, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  orderId: string
  currentAnalystId: string | null
  analysts: { id: string; first_name: string | null; last_name: string | null; email: string }[]
}

export default function AssignAnalystForm({ orderId, currentAnalystId, analysts }: Props) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState(currentAnalystId ?? '')

  function handleAssign() {
    startTransition(async () => {
      try {
        await assignAnalyst(orderId, selected)
        toast.success(selected ? 'Analyst assigned' : 'Analyst removed')
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  return (
    <div className="space-y-3">
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Unassigned</option>
        {analysts.map(a => (
          <option key={a.id} value={a.id}>{[a.first_name, a.last_name].filter(Boolean).join(' ') || a.email}</option>
        ))}
      </select>
      <button
        onClick={handleAssign}
        disabled={pending || selected === (currentAnalystId ?? '')}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium py-2.5 rounded-xl transition text-sm"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
        {selected ? 'Assign Analyst' : 'Remove Assignment'}
      </button>
    </div>
  )
}
