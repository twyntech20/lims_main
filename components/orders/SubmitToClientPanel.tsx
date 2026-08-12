'use client'

import { useState, useTransition } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { submitToClient } from '@/app/actions/orders'
import { Send, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'

interface ApprovedRow {
  id: string
  testName: string
  result: string | null
  unit: string | null
  qualifier: string | null
  sampleId: string
  reviewerName: string
  approvedAt: string | null
}

interface Props {
  orderId: string
  orderNumber: string
  clientName: string
  rows: ApprovedRow[]
}

export default function SubmitToClientPanel({ orderId, orderNumber, clientName, rows }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleConfirm() {
    startTransition(async () => {
      try {
        await submitToClient(orderId)
        toast.success('Submitted to client')
        setDone(true)
        setConfirming(false)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to submit')
      }
    })
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
        <Toaster position="top-center" />
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        <p className="text-sm text-green-800 font-medium">Submitted to client — this order is now complete.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <Toaster position="top-center" />
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-green-600" />
        <h2 className="font-semibold text-slate-900">Ready for Client</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        All {rows.length} result{rows.length !== 1 ? 's' : ''} for this order have been reviewed and approved.
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
        >
          <Send className="w-4 h-4" /> Submit to Client
        </button>
      ) : (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Final review before submission</p>
          <div className="text-sm space-y-1.5">
            <p><span className="text-slate-500">Client:</span> <span className="font-medium text-slate-900">{clientName}</span></p>
            <p><span className="text-slate-500">Order:</span> <span className="font-medium text-slate-900">{orderNumber}</span></p>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {rows.map(r => (
              <div key={r.id} className="px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{r.sampleId} · {r.testName}</span>
                  <span className="font-mono text-slate-600">
                    {r.qualifier === 'ND' ? 'ND' : [r.qualifier, r.result].filter(Boolean).join(' ') || '—'} {r.unit ?? ''}
                  </span>
                </div>
                <p className="text-slate-400 mt-0.5">
                  Reviewed by {r.reviewerName}{r.approvedAt ? ` on ${new Date(r.approvedAt).toLocaleDateString()}` : ''}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Final status after submission: <span className="font-semibold text-slate-700">Submitted</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={pending}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-300 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {pending ? 'Submitting…' : 'Confirm & Submit'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
