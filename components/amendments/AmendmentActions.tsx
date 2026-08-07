'use client'

import { useState, useTransition } from 'react'
import { approveAmendment, rejectAmendment } from '@/app/actions/amendments'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Props { id: string }

export default function AmendmentActions({ id }: Props) {
  const [pending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  function handleApprove() {
    startTransition(async () => {
      await approveAmendment(id)
    })
  }

  function handleReject() {
    startTransition(async () => {
      await rejectAmendment(id, rejectReason || 'Rejected')
      setRejectOpen(false)
    })
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleApprove}
        disabled={pending}
        className="inline-flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg font-medium transition"
      >
        {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        Approve
      </button>
      <button
        onClick={() => setRejectOpen(true)}
        disabled={pending}
        className="inline-flex items-center gap-1 text-xs bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg font-medium transition"
      >
        <XCircle className="w-3 h-3" />
        Reject
      </button>

      {rejectOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Reject Amendment</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectOpen(false)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={pending}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition"
              >
                {pending && <Loader2 className="w-3 h-3 animate-spin" />}
                Reject Amendment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
