'use client'

import { useState, useTransition } from 'react'
import { enterResultsBatch, submitSampleForReview } from '@/app/actions/results'
import { ChevronDown, ChevronRight, CheckCircle2, Clock, FlaskConical, Loader2, Undo2, AlertTriangle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import {
  workflowState, WORKFLOW_LABEL, WORKFLOW_BADGE, WORKFLOW_NEXT_ACTION,
  personName, waitingTime, isOverdue,
} from '@/lib/workflow'

type Person = { id?: string; first_name: string | null; last_name: string | null; email: string } | null

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
    method: string | null
    mdl: string | null
    matrix: string | null
    unit_options: string | null
  } | null
  entered_by_profile: Person
  assigned_reviewer_profile: Person
  returned_by_profile: Person
}

export type Reviewer = { id: string; first_name: string | null; last_name: string | null; email: string }

const PRIORITY_BADGE: Record<string, string> = {
  normal:       'bg-slate-100 text-slate-600',
  priority_24h: 'bg-orange-100 text-orange-700',
  priority_48h: 'bg-yellow-100 text-yellow-700',
  same_day:     'bg-red-100 text-red-700',
}

const PRIORITY_LABEL: Record<string, string> = {
  normal:       'Normal',
  priority_24h: '24h',
  priority_48h: '48h',
  same_day:     'STAT',
}

const INPUT = 'w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

function ResultRow({ st, reviewers }: { st: SampleTest; reviewers: Reviewer[] }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult]               = useState(st.result ?? '')
  const [unit, setUnit]                   = useState(st.unit ?? st.tests?.unit ?? '')
  const [qualifier, setQualifier]         = useState(st.qualifier ?? '')
  // MDL falls back to the analysis catalog (Master List of Analyses) so the
  // analyst starts from the documented detection limit.
  const [mdl, setMdl]                     = useState(st.mdl ?? st.tests?.mdl ?? '')
  const [dilution, setDilution]           = useState(st.dilution_factor?.toString() ?? '')
  const [notes, setNotes]                 = useState(st.analyst_notes ?? '')
  const [dirty, setDirty]                 = useState(false)
  const [reviewing, startReview]          = useTransition()
  const [reviewerId, setReviewerId]       = useState('')

  const state = workflowState({
    status: st.status,
    returned_at: st.returned_at,
    assigned_reviewer_id: st.assigned_reviewer_id,
    order_released_at: st.samples?.orders?.released_at,
  })

  function markDirty() { setDirty(true) }

  function handleSave() {
    startTransition(async () => {
      try {
        await enterResultsBatch(st.id, {
          result:          qualifier === 'ND' ? null : result || null,
          unit:            unit || null,
          qualifier:       qualifier || null,
          mdl:             mdl || null,
          dilution_factor: dilution ? parseFloat(dilution) : null,
          analyst_notes:   notes || null,
        })
        setDirty(false)
        toast.success('Result saved')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to save')
      }
    })
  }

  function handleAssignReview() {
    if (!reviewerId) { toast.error('Select a reviewer first'); return }
    startReview(async () => {
      try {
        await submitSampleForReview(st.id, reviewerId)
        toast.success('Assigned for review')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to assign review')
      }
    })
  }

  const isReadonly = state === 'in_review' || state === 'approved' || state === 'released'
  const canSubmitForReview = state === 'awaiting_review' || state === 'returned'

  // Who currently holds this piece of work.
  const owner = state === 'in_review'
    ? `Reviewer: ${personName(st.assigned_reviewer_profile)}`
    : st.entered_by_profile
      ? `Analyst: ${personName(st.entered_by_profile)}`
      : 'Unassigned'

  // The clock that matters for this state: how long it has been waiting
  // where it is now.
  const waitingSince = state === 'in_review' ? st.entered_at : st.returned_at ?? st.entered_at

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50 transition">
        {/* Test */}
        <td className="px-4 py-3">
          <div className="font-medium text-slate-900 text-sm">{st.tests?.name ?? '—'}</div>
          {st.tests?.code && <div className="text-xs text-slate-400 font-mono">{st.tests.code}</div>}
          {st.tests?.method && <div className="text-xs text-slate-400">{st.tests.method}</div>}
          <span className={`mt-0.5 inline-block text-xs px-1.5 py-0.5 rounded-full ${
            st.tests?.category === 'microbiology' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
          }`}>{st.tests?.category}</span>
        </td>

        {/* Result */}
        <td className="px-3 py-3 w-32">
          {isReadonly
            ? <span className="text-sm text-slate-700">{qualifier === 'ND' ? 'ND' : result || '—'}</span>
            : <input value={qualifier === 'ND' ? '' : result}
                onChange={e => { setResult(e.target.value); markDirty() }}
                disabled={qualifier === 'ND'}
                placeholder="0.00"
                className={INPUT} />
          }
        </td>

        {/* Unit */}
        <td className="px-3 py-3 w-24">
          {isReadonly
            ? <span className="text-sm text-slate-500">{unit || '—'}</span>
            : <input value={unit} onChange={e => { setUnit(e.target.value); markDirty() }}
                placeholder={st.tests?.unit ?? 'unit'}
                title={st.tests?.unit_options ? `Catalog units: ${st.tests.unit_options}` : undefined}
                className={INPUT} />
          }
        </td>

        {/* Qualifier */}
        <td className="px-3 py-3 w-24">
          {isReadonly
            ? <span className="text-sm text-slate-500">{qualifier || '—'}</span>
            : <select value={qualifier} onChange={e => { setQualifier(e.target.value); markDirty() }} className={INPUT}>
                <option value="">—</option>
                <option value="ND">ND</option>
                <option value="<">{"<"}</option>
                <option value=">">{">"}</option>
                <option value="B">B</option>
                <option value="E">E</option>
              </select>
          }
        </td>

        {/* MDL */}
        <td className="px-3 py-3 w-24">
          {isReadonly
            ? <span className="text-sm text-slate-500">{mdl || '—'}</span>
            : <input value={mdl} onChange={e => { setMdl(e.target.value); markDirty() }}
                placeholder={st.tests?.mdl ?? 'MDL'} className={INPUT} />
          }
        </td>

        {/* Dilution */}
        <td className="px-3 py-3 w-20">
          {isReadonly
            ? <span className="text-sm text-slate-500">{dilution || '1'}</span>
            : <input value={dilution} onChange={e => { setDilution(e.target.value); markDirty() }}
                placeholder="1" type="number" min="0" step="0.1" className={INPUT} />
          }
        </td>

        {/* Workflow state */}
        <td className="px-3 py-3 w-40">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WORKFLOW_BADGE[state]}`}>
            {WORKFLOW_LABEL[state]}
          </span>
          {(st.review_round ?? 1) > 1 && (
            <div className="text-[11px] text-slate-400 mt-1">Review round {st.review_round}</div>
          )}
        </td>

        {/* Who holds it, and for how long */}
        <td className="px-3 py-3 w-44 text-xs text-slate-500">
          <div className="text-slate-700">{owner}</div>
          {state !== 'released' && state !== 'awaiting_entry' && (
            <div className="text-slate-400 mt-0.5">Waiting {waitingTime(waitingSince)}</div>
          )}
        </td>

        {/* Next action */}
        <td className="px-3 py-3 w-44 text-xs text-slate-500">{WORKFLOW_NEXT_ACTION[state]}</td>

        {/* Actions */}
        <td className="px-3 py-3 w-48">
          {state === 'released' ? (
            <span className="text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Released</span>
          ) : state === 'approved' ? (
            <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>
          ) : state === 'in_review' ? (
            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> With reviewer</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {dirty && (
                <button onClick={handleSave} disabled={pending}
                  className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
                  {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {pending ? 'Saving…' : 'Save'}
                </button>
              )}
              {canSubmitForReview && !dirty && (
                <div className="flex flex-col gap-1">
                  <select value={reviewerId} onChange={e => setReviewerId(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Reviewer…</option>
                    {reviewers.map(r => (
                      <option key={r.id} value={r.id}>
                        {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email}
                      </option>
                    ))}
                  </select>
                  <button onClick={handleAssignReview} disabled={reviewing || !reviewerId}
                    className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
                    {reviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                    {reviewing ? '…' : state === 'returned' ? 'Re-submit Review' : 'Assign Review'}
                  </button>
                </div>
              )}
            </div>
          )}
        </td>
      </tr>

      {/* What is blocking this result — the reviewer's reason, kept until
          it goes back for review so the analyst can see what to fix. */}
      {state === 'returned' && st.rejection_reason && (
        <tr className="border-b border-slate-100 bg-red-50">
          <td colSpan={10} className="px-4 py-2">
            <div className="flex items-start gap-2 text-xs">
              <Undo2 className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-red-700">
                  Returned by {personName(st.returned_by_profile)}
                  {st.returned_at ? ` · ${waitingTime(st.returned_at)} ago` : ''}:
                </span>{' '}
                <span className="text-red-800">{st.rejection_reason}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

type GroupedBySample = {
  sampleKey: string
  sample: SampleTest['samples']
  order: NonNullable<SampleTest['samples']>['orders']
  tests: SampleTest[]
}

export default function WorkQueueTable({ rows, orderBasePath = '/admin/orders', reviewers = [] }: { rows: SampleTest[]; orderBasePath?: string; reviewers?: Reviewer[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Group by sample
  const groups: GroupedBySample[] = []
  const seen = new Map<string, GroupedBySample>()

  for (const row of rows) {
    const key = row.samples?.id ?? 'unknown'
    if (!seen.has(key)) {
      const g: GroupedBySample = { sampleKey: key, sample: row.samples, order: row.samples?.orders ?? null, tests: [] }
      seen.set(key, g)
      groups.push(g)
    }
    seen.get(key)!.tests.push(row)
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <FlaskConical className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No samples match the current filters</p>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="space-y-4">
        {groups.map(({ sampleKey, sample, order, tests }) => {
          const isCollapsed = collapsed.has(sampleKey)
          const states = tests.map(t => workflowState({
            status: t.status,
            returned_at: t.returned_at,
            assigned_reviewer_id: t.assigned_reviewer_id,
            order_released_at: order?.released_at,
          }))
          const count = (s: string) => states.filter(x => x === s).length
          const allDone = states.every(s => s === 'approved' || s === 'released')
          const returnedCount = count('returned')
          const overdue = isOverdue(order?.date_due) && !allDone

          return (
            <div key={sampleKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Sample header */}
              <button
                type="button"
                onClick={() => toggle(sampleKey)}
                className="w-full px-6 py-4 flex items-center gap-3 hover:bg-slate-50 transition text-left">
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
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
                    {order?.customer_name && <span>· {order.customer_name}</span>}
                    {order?.id && (
                      <a href={`${orderBasePath}/${order.id}`} onClick={e => e.stopPropagation()}
                        className="text-blue-500 hover:underline">View order</a>
                    )}
                    {order?.date_due && (
                      <span className={overdue ? 'text-red-500 font-medium' : ''}>
                        Due: {new Date(order.date_due).toLocaleDateString()}
                      </span>
                    )}
                    {sample?.collection_date && (
                      <span>Collected: {new Date(sample.collection_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {returnedCount > 0 && (
                    <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                      {returnedCount} returned
                    </span>
                  )}
                  {count('awaiting_entry') > 0 && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {count('awaiting_entry')} to enter
                    </span>
                  )}
                  {count('awaiting_review') > 0 && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
                      {count('awaiting_review')} to assign
                    </span>
                  )}
                  {count('in_review') > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      {count('in_review')} in review
                    </span>
                  )}
                  {allDone && (
                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {count('released') > 0 ? 'Released' : 'Ready for release'}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{tests.length} test{tests.length !== 1 ? 's' : ''}</span>
                </div>
              </button>

              {/* Test rows */}
              {!isCollapsed && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Test</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Result</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qual</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">MDL</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dilution</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Next action</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {tests.map(st => <ResultRow key={st.id} st={st} reviewers={reviewers} />)}
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
