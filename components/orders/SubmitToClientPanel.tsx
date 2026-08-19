'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  /**
   * Release state as the server sees it. The panel refuses to offer the
   * action when this is true, so a caller that forgets to gate cannot
   * put an actionable release button in front of a released order.
   */
  released?: boolean
  releasedAt?: string | null
  releasedBy?: string | null
}

export default function SubmitToClientPanel({
  orderId, orderNumber, clientName, rows, released = false, releasedAt, releasedBy,
}: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  // Server truth wins; `done` only covers the gap between a successful
  // submit and the refreshed server render arriving.
  const isReleased = released || done

  function handleConfirm() {
    if (pending || isReleased) return
    startTransition(async () => {
      try {
        await submitToClient(orderId)
        toast.success('Submitted to client')
        setDone(true)
        setConfirming(false)
        // Pull the refreshed server state so the status badge, timeline and
        // report link update with the panel — no manual reload needed.
        router.refresh()
      } catch (err: any) {
        const message = err?.message ?? 'Failed to submit'
        // A duplicate attempt means the order is already out. Reflect that
        // instead of leaving an actionable button on screen.
        if (/already been released/i.test(message)) {
          setDone(true)
          setConfirming(false)
          router.refresh()
        }
        toast.error(message)
      }
    })
  }

  if (isReleased) {
    return (
      <div className="rounded-lg border border-ok-line bg-ok-bg p-3.5">
        <Toaster position="top-center" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-ok-fg" />
          <p className="text-[13px] font-medium text-ok-fg">Submitted to Client</p>
        </div>
        <p className="mt-1.5 text-[12px] text-ink-2">
          This order has already been released to the client.
        </p>
        {releasedBy && <p className="mt-1 text-[12px] text-ink-2">by {releasedBy}</p>}
        {releasedAt && (
          <p className="tabular text-[12px] text-ink-3">
            {new Date(releasedAt).toLocaleString('en-AU')}
          </p>
        )}
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
