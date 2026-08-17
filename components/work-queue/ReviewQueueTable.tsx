'use client'

import { useState, useTransition } from 'react'
import { approveSampleTest, rejectToAnalyst } from '@/app/actions/results'
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, ClipboardCheck, Loader2, AlertTriangle, Undo2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import {
  workflowState, WORKFLOW_LABEL, WORKFLOW_BADGE,
  personName, waitingTime, isOverdue, MIN_COMMENT_LENGTH,
} from '@/lib/workflow'

type Person = { first_name: string | null; last_name: string | null; email: string } | null

type SampleTest = {
  id: string
  status: string
  result: string | null
  unit: string | null
  qualifier: string | null
  mdl: string | null
  dilution_factor: number | null
  analyst_notes: string | null
  entered_at: string | null
  reviewed_at: string | null
  returned_at: string | null
  rejection_reason: string | null
  review_round: number | null
  assigned_reviewer_id: string | null
  samples: {
    id: string
    sample_id: string
    description: string | null
    matrix_type: string | null
    collection_date: string | null
    orders: {
      id: string
      order_number?: string | null
      priority: string
      date_due: string | null
      customer_name: string | null
      released_at: string | null
      clients: { client_name: string } | null
    } | null
  } | null
  tests: {
    id: string
    name: string
    code: string | null
    category: string
    unit: string | null
  } | null
  entered_by_profile: Person
  reviewed_by_profile: Person
  assigned_reviewer_profile: Person
  returned_by_profile: Person
}

const PRIORITY_BADGE: Record<string, string> = {
  normal:       'bg-slate-100 text-slate-600',
  priority_24h: 'bg-orange-100 text-orange-700',
  priority_48h: 'bg-yellow-100 text-yellow-700',
  same_day:     'bg-red-100 text-red-700',
}

const PRIORITY_LABEL: Record<string, string> = {
  normal: 'Normal', priority_24h: '24h', priority_48h: '48h', same_day: 'STAT',
}

function ReviewRow({ st }: { st: SampleTest }) {
  const [approving, startApprove] = useTransition()
  const [rejecting, startReject]  = useTransition()
  const [rejectNote, setRejectNote] = useState('')
  const [showReject, setShowReject] = useState(false)

  const order = st.samples?.orders ?? null
  const state = workflowState({
    status: st.status,
    returned_at: st.returned_at,
    assigned_reviewer_id: st.assigned_reviewer_id,
    order_released_at: order?.released_at,
  })
  const overdue = isOverdue(order?.date_due) && state === 'in_review'

  function handleApprove() {
    startApprove(async () => {
      try {
        await approveSampleTest(st.id)
        toast.success('Approved')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed')
      }
    })
  }

  function handleReject() {
    startReject(async () => {
      try {
        await rejectToAnalyst(st.id, rejectNote)
        toast.success('Returned to the analyst')
        setShowReject(false)
        setRejectNote('')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed')
      }
    })
  }

  const displayResult = st.qualifier === 'ND' ? 'ND' : [st.qualifier, st.result].filter(Boolean).join(' ') || '—'
  const noteTooShort = rejectNote.trim().length < MIN_COMMENT_LENGTH

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50 transition">
        <td className="px-4 py-3">
          <div className="font-medium text-slate-900 text-sm">{st.tests?.name ?? '—'}</div>
          {st.tests?.code && <div className="text-xs text-slate-400 font-mono">{st.tests.code}</div>}
          <span className={`mt-0.5 inline-block text-xs px-1.5 py-0.5 rounded-full ${
            st.tests?.category === 'microbiology' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
          }`}>{st.tests?.category}</span>
        </td>
        <td className="px-3 py-3">
          <span className="font-medium text-slate-900 text-sm">{displayResult}</span>
          {st.unit && <span className="text-slate-400 text-xs ml-1">{st.unit}</span>}
          <div className="text-xs text-slate-400 mt-0.5">
            MDL {st.mdl || '—'} · DF {st.dilution_factor ?? 1}
          </div>
        </td>
        <td className="px-3 py-3 text-xs text-slate-500 max-w-48">
          {st.analyst_notes ? <span className="italic">{st.analyst_notes}</span> : '—'}
        </td>
        <td className="px-3 py-3 text-xs text-slate-500">{personName(st.entered_by_profile)}</td>
        <td className="px-3 py-3 text-xs text-slate-500">{personName(st.assigned_reviewer_profile)}</td>
        <td className="px-3 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WORKFLOW_BADGE[state]}`}>
            {WORKFLOW_LABEL[state]}
          </span>
          {(st.review_round ?? 1) > 1 && (
            <div className="text-[11px] text-slate-400 mt-1">Round {st.review_round}</div>
          )}
        </td>
        <td className="px-3 py-3 text-xs">
          <span className={overdue ? 'text-red-600 font-semibold' : 'text-slate-500'}>
            {waitingTime(st.entered_at)}
          </span>
          {overdue && (
            <div className="text-[11px] text-red-500 flex items-center gap-0.5 mt-0.5">
              <AlertTriangle className="w-3 h-3" /> Past due
            </div>
          )}
        </td>
        <td className="px-3 py-3 w-48">
          {state === 'in_review' && (
            <div className="flex gap-1.5">
              <button onClick={handleApprove} disabled={approving}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-500 disabled:bg-green-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
                {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                {approving ? '…' : 'Approve'}
              </button>
              <button onClick={() => setShowReject(v => !v)}
                className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium px-3 py-1.5 rounded-lg transition border border-red-200">
                <XCircle className="w-3 h-3" />
                Return
              </button>
            </div>
          )}
          {(state === 'awaiting_review' || state === 'returned') && (
            <span className="text-xs text-slate-400">With the analyst</span>
          )}
          {(state === 'approved' || state === 'released') && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {WORKFLOW_LABEL[state]}
            </span>
          )}
        </td>
      </tr>

      {/* Previous return on this result — review history is not erased when
          the analyst re-submits, so the reviewer can see what was already
          raised once. */}
      {st.rejection_reason && (
        <tr className="border-b border-slate-100 bg-amber-50">
          <td colSpan={8} className="px-4 py-2">
            <div className="flex items-start gap-2 text-xs">
              <Undo2 className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-amber-800">
                  Previously returned by {personName(st.returned_by_profile)}:
                </span>{' '}
                <span className="text-amber-900">{st.rejection_reason}</span>
              </div>
            </div>
          </td>
        </tr>
      )}

      {showReject && (
        <tr className="border-b border-slate-100 bg-red-50">
          <td colSpan={8} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-red-700 shrink-0">Reason for return:</span>
              <input
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder={`Explain what needs to be corrected (min ${MIN_COMMENT_LENGTH} characters)…`}
                className="flex-1 bg-white border border-red-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button onClick={handleReject} disabled={rejecting || noteTooShort}
                title={noteTooShort ? `At least ${MIN_COMMENT_LENGTH} characters are required` : undefined}
                className="bg-red-600 hover:bg-red-500 disabled:bg-red-300 text-white text-xs font-medium px-4 py-2 rounded-lg transition flex items-center gap-1 shrink-0">
                {rejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {rejecting ? 'Sending…' : 'Send back'}
              </button>
              <button onClick={() => setShowReject(false)}
                className="text-slate-400 hover:text-slate-600 text-xs shrink-0">Cancel</button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

type Group = {
  sampleKey: string
  sample: SampleTest['samples']
  tests: SampleTest[]
}

export default function ReviewQueueTable({ rows, orderBasePath = '/admin/orders' }: { rows: SampleTest[]; orderBasePath?: string }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const groups: Group[] = []
  const seen = new Map<string, Group>()
  for (const row of rows) {
    const key = row.samples?.id ?? 'unknown'
    if (!seen.has(key)) {
      const g: Group = { sampleKey: key, sample: row.samples, tests: [] }
      seen.set(key, g)
      groups.push(g)
    }
    seen.get(key)!.tests.push(row)
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <ClipboardCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No results awaiting review</p>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="space-y-4">
        {groups.map(({ sampleKey, sample, tests }) => {
          const isCollapsed = collapsed.has(sampleKey)
          const order = sample?.orders ?? null
          const inReviewCount = tests.filter(t => t.status === 'reviewed').length
          const approvedCount = tests.filter(t => t.status === 'approved').length
          const overdue = isOverdue(order?.date_due) && inReviewCount > 0

          return (
            <div key={sampleKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button type="button" onClick={() => toggle(sampleKey)}
                className="w-full px-6 py-4 flex items-center gap-3 hover:bg-slate-50 transition text-left">
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    {order?.order_number && (
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{order.order_number}</span>
                    )}
                    <span className="font-semibold text-slate-900 font-mono">{sample?.sample_id}</span>
                    {sample?.description && <span className="text-slate-500 text-sm truncate">{sample.description}</span>}
                    {sample?.matrix_type && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{sample.matrix_type}</span>
                    )}
                    {order?.priority && order.priority !== 'normal' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[order.priority] ?? ''}`}>
                        {PRIORITY_LABEL[order.priority]}
                      </span>
                    )}
                    {overdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    {order?.clients?.client_name && <span>{order.clients.client_name}</span>}
                    {order?.date_due && (
                      <span className={overdue ? 'text-red-500 font-medium' : ''}>
                        Due: {new Date(order.date_due).toLocaleDateString()}
                      </span>
                    )}
                    {order?.id && (
                      <a href={`${orderBasePath}/${order.id}`} onClick={e => e.stopPropagation()}
                        className="text-blue-500 hover:underline">View order</a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {inReviewCount > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      {inReviewCount} to review
                    </span>
                  )}
                  {approvedCount > 0 && (
                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                      {approvedCount} approved
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{tests.length} tests</span>
                </div>
              </button>

              {!isCollapsed && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Test</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Result</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Analyst notes</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Analyst</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reviewer</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Waiting</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {tests.map(st => <ReviewRow key={st.id} st={st} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
