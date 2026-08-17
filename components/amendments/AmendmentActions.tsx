'use client'

import { useState, useTransition } from 'react'
import { approveAmendment, rejectAmendment } from '@/app/actions/amendments'
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { MIN_COMMENT_LENGTH } from '@/lib/workflow'

interface Props {
  id: string
  /** Set when the amendment carries a replacement value for a specific result. */
  appliesToResult?: boolean
  targetLabel?: string | null
}

export default function AmendmentActions({ id, appliesToResult = false, targetLabel }: Props) {
  const [pending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [approveComment, setApproveComment] = useState('')

  const reasonTooShort = rejectReason.trim().length < MIN_COMMENT_LENGTH

  function handleApprove() {
    startTransition(async () => {
      try {
        await approveAmendment(id, approveComment)
        toast.success(appliesToResult ? 'Approved and applied — the result is back in review' : 'Amendment approved')
        setApproveOpen(false)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to approve')
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      try {
        await rejectAmendment(id, rejectReason)
        toast.success('Amendment rejected')
        setRejectOpen(false)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to reject')
      }
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Toaster position="top-center" />
      <button
        onClick={() => setApproveOpen(true)}
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

      {approveOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Approve Amendment</h3>
            {appliesToResult ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-900">
                  This will overwrite the approved value{targetLabel ? ` on ${targetLabel}` : ''}. The previous
                  value is recorded on this amendment, the result returns to review, and a released order has
                  to be released again.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-4">
                This amendment is not linked to a result, so nothing is changed automatically — it is recorded
                as approved.
              </p>
            )}
            <textarea
              value={approveComment}
              onChange={e => setApproveComment(e.target.value)}
              placeholder="Approval comment (optional)…"
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setApproveOpen(false)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleApprove} disabled={pending}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:bg-green-300 text-white font-medium rounded-xl transition">
                {pending && <Loader2 className="w-3 h-3 animate-spin" />}
                {appliesToResult ? 'Approve & Apply' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Reject Amendment</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={`Reason for rejection (at least ${MIN_COMMENT_LENGTH} characters)…`}
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Recorded against the amendment — the original request is kept intact.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectOpen(false)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleReject} disabled={pending || reasonTooShort}
                title={reasonTooShort ? `At least ${MIN_COMMENT_LENGTH} characters are required` : undefined}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:bg-red-300 text-white font-medium rounded-xl transition">
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
