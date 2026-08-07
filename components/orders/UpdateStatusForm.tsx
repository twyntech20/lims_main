'use client'

import { useTransition, useState } from 'react'
import { updateOrderStatus } from '@/app/actions/orders'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const TRANSITIONS: Record<string, { next: string[]; labels: Record<string, string> }> = {
  new:        { next: ['submitted', 'cancelled'], labels: { submitted: 'Mark Submitted', cancelled: 'Cancel Order' } },
  submitted:  { next: ['in_progress', 'cancelled'], labels: { in_progress: 'Start Processing', cancelled: 'Cancel Order' } },
  in_progress:{ next: ['review', 'cancelled'], labels: { review: 'Send to Review', cancelled: 'Cancel Order' } },
  review:     { next: ['completed', 'in_progress'], labels: { completed: 'Mark Completed', in_progress: 'Send Back' } },
  completed:  { next: [], labels: {} },
  cancelled:  { next: ['new'], labels: { new: 'Reopen Order' } },
}

const BUTTON_STYLES: Record<string, string> = {
  submitted: 'bg-blue-600 hover:bg-blue-500 text-white',
  in_progress: 'bg-yellow-500 hover:bg-yellow-400 text-white',
  review: 'bg-purple-600 hover:bg-purple-500 text-white',
  completed: 'bg-green-600 hover:bg-green-500 text-white',
  cancelled: 'bg-red-100 hover:bg-red-200 text-red-700',
  new: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
}

interface Props { orderId: string; currentStatus: string }

export default function UpdateStatusForm({ orderId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition()
  const { next, labels } = TRANSITIONS[currentStatus] ?? { next: [], labels: {} }

  if (next.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-2">No further actions available</p>
  }

  return (
    <div className="space-y-2">
      {next.map(status => (
        <button
          key={status}
          disabled={pending}
          onClick={() => startTransition(async () => {
            try {
              await updateOrderStatus(orderId, status)
              toast.success(`Status updated to ${status.replace('_', ' ')}`)
            } catch (e: any) {
              toast.error(e.message)
            }
          })}
          className={`w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-xl transition text-sm ${BUTTON_STYLES[status]}`}
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {labels[status]}
        </button>
      ))}
    </div>
  )
}
