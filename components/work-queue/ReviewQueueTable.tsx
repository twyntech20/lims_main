'use client'

import { useState, useTransition } from 'react'
import { approveSampleTest, rejectToAnalyst } from '@/app/actions/results'
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, ClipboardCheck, Loader2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

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
  samples: {
    id: string
    sample_id: string
    description: string | null
    matrix_type: string | null
    collection_date: string | null
    orders: {
      id: string
      priority: string
      date_due: string | null
      customer_name: string | null
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
  entered_by_profile: { first_name: string | null; last_name: string | null; email: string } | null
  reviewed_by_profile: { first_name: string | null; last_name: string | null; email: string } | null
}

const STATUS_BADGE: Record<string, string> = {
  entered:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
  reviewed: 'bg-blue-50 text-blue-700 border border-blue-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
}

function ReviewRow({ st }: { st: SampleTest }) {
  const [approving, startApprove] = useTransition()
  const [rejecting, startReject]  = useTransition()
  const [rejectNote, setRejectNote] = useState('')
  const [showReject, setShowReject] = useState(false)

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
        toast.success('Sent back to analyst')
        setShowReject(false)
        setRejectNote('')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed')
      }
    })
  }

  const displayResult = st.qualifier === 'ND' ? 'ND' : [st.qualifier, st.result].filter(Boolean).join(' ') || '—'
  const analystName = st.entered_by_profile
    ? [st.entered_by_profile.first_name, st.entered_by_profile.last_name].filter(Boolean).join(' ') || st.entered_by_profile.email
    : '—'

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
        </td>
        <td className="px-3 py-3 text-sm text-slate-500">{st.mdl || '—'}</td>
        <td className="px-3 py-3 text-sm text-slate-500">{st.dilution_factor ?? 1}</td>
        <td className="px-3 py-3 text-xs text-slate-500 max-w-48">
          {st.analyst_notes ? (
            <span className="italic">{st.analyst_notes}</span>
          ) : '—'}
        </td>
        <td className="px-3 py-3 text-xs text-slate-500">{analystName}</td>
        <td className="px-3 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[st.status] ?? ''}`}>
            {st.status}
          </span>
        </td>
        <td className="px-3 py-3 w-48">
          {st.status === 'reviewed' && (
            <div className="flex gap-1.5">
              <button onClick={handleApprove} disabled={approving}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-500 disabled:bg-green-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
                {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                {approving ? '…' : 'Approve'}
              </button>
              <button onClick={() => setShowReject(v => !v)}
                className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium px-3 py-1.5 rounded-lg transition border border-red-200">
                <XCircle className="w-3 h-3" />
                Reject
              </button>
            </div>
          )}
          {st.status === 'entered' && (
            <span className="text-xs text-slate-400">Awaiting analyst submit</span>
          )}
          {st.status === 'approved' && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Approved
            </span>
          )}
        </td>
      </tr>
      {showReject && (
        <tr className="border-b border-slate-100 bg-red-50">
          <td colSpan={8} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-red-700">Rejection note:</span>
              <input
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Explain what needs to be corrected…"
                className="flex-1 bg-white border border-red-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button onClick={handleReject} disabled={rejecting}
                className="bg-red-600 hover:bg-red-500 disabled:bg-red-300 text-white text-xs font-medium px-4 py-2 rounded-lg transition flex items-center gap-1">
                {rejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {rejecting ? 'Sending…' : 'Send back'}
              </button>
              <button onClick={() => setShowReject(false)}
                className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
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

export default function ReviewQueueTable({ rows }: { rows: SampleTest[] }) {
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
          const order = (sample as any)?.orders as SampleTest['samples'] extends null ? null : NonNullable<SampleTest['samples']>['orders']
          const reviewedCount = tests.filter(t => t.status === 'reviewed').length
          const approvedCount = tests.filter(t => t.status === 'approved').length

          return (
            <div key={sampleKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button type="button" onClick={() => toggle(sampleKey)}
                className="w-full px-6 py-4 flex items-center gap-3 hover:bg-slate-50 transition text-left">
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900 font-mono">{sample?.sample_id}</span>
                    {sample?.description && <span className="text-slate-500 text-sm truncate">{sample.description}</span>}
                    {sample?.matrix_type && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{sample.matrix_type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    {(order as any)?.clients?.client_name && <span>{(order as any).clients.client_name}</span>}
                    {(order as any)?.id && (
                      <a href={`/admin/orders/${(order as any).id}`} onClick={e => e.stopPropagation()}
                        className="text-blue-500 hover:underline">View order</a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {reviewedCount > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      {reviewedCount} to review
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
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">MDL</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dilution</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Analyst</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
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
