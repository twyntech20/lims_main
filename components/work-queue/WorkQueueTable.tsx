'use client'

import { useState, useTransition } from 'react'
import { enterResultsBatch, submitSampleForReview } from '@/app/actions/results'
import { ChevronDown, ChevronRight, CheckCircle2, Clock, FlaskConical, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'

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
}

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-slate-100 text-slate-600',
  entered:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
  reviewed: 'bg-blue-50 text-blue-700 border border-blue-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
}

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

function ResultRow({ st }: { st: SampleTest }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult]               = useState(st.result ?? '')
  const [unit, setUnit]                   = useState(st.unit ?? st.tests?.unit ?? '')
  const [qualifier, setQualifier]         = useState(st.qualifier ?? '')
  const [mdl, setMdl]                     = useState(st.mdl ?? '')
  const [dilution, setDilution]           = useState(st.dilution_factor?.toString() ?? '')
  const [notes, setNotes]                 = useState(st.analyst_notes ?? '')
  const [dirty, setDirty]                 = useState(false)
  const [reviewing, startReview]          = useTransition()

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

  function handleReview() {
    startReview(async () => {
      try {
        await submitSampleForReview(st.id)
        toast.success('Submitted for review')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to submit')
      }
    })
  }

  const isReadonly = st.status === 'reviewed' || st.status === 'approved'

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition">
      {/* Test */}
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900 text-sm">{st.tests?.name ?? '—'}</div>
        {st.tests?.code && <div className="text-xs text-slate-400 font-mono">{st.tests.code}</div>}
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
              placeholder={st.tests?.unit ?? 'unit'} className={INPUT} />
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
              placeholder="MDL" className={INPUT} />
        }
      </td>

      {/* Dilution */}
      <td className="px-3 py-3 w-20">
        {isReadonly
          ? <span className="text-sm text-slate-500">{dilution || '1'}</span>
          : <input value={dilution} onChange={e => { setDilution(e.target.value); markDirty() }}
              placeholder="1" type="number" min="1" step="0.1" className={INPUT} />
        }
      </td>

      {/* Status */}
      <td className="px-3 py-3 w-24">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[st.status] ?? 'bg-slate-100 text-slate-600'}`}>
          {st.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 w-32">
        {isReadonly
          ? <span className="text-xs text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {st.status}</span>
          : <div className="flex flex-col gap-1.5">
              {dirty && (
                <button onClick={handleSave} disabled={pending}
                  className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
                  {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {pending ? 'Saving…' : 'Save'}
                </button>
              )}
              {st.status === 'entered' && !dirty && (
                <button onClick={handleReview} disabled={reviewing}
                  className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
                  {reviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                  {reviewing ? '…' : 'Submit'}
                </button>
              )}
            </div>
        }
      </td>
    </tr>
  )
}

type GroupedBySample = {
  sampleKey: string
  sample: SampleTest['samples']
  order: SampleTest['samples'] extends null ? null : NonNullable<SampleTest['samples']>['orders']
  tests: SampleTest[]
}

export default function WorkQueueTable({ rows, orderBasePath = '/admin/orders' }: { rows: SampleTest[]; orderBasePath?: string }) {
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
      const g: GroupedBySample = { sampleKey: key, sample: row.samples, order: row.samples?.orders as any, tests: [] }
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
          const allDone = tests.every(t => t.status === 'approved')
          const allEntered = tests.every(t => ['entered','reviewed','approved'].includes(t.status))
          const pendingCount = tests.filter(t => t.status === 'pending').length
          const enteredCount = tests.filter(t => t.status === 'entered').length

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
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    {order?.clients?.client_name && <span>{order.clients.client_name}</span>}
                    {order?.customer_name && <span>· {order.customer_name}</span>}
                    {order?.id && (
                      <a href={`${orderBasePath}/${order.id}`} onClick={e => e.stopPropagation()}
                        className="text-blue-500 hover:underline">View order</a>
                    )}
                    {order?.date_due && <span>Due: {new Date(order.date_due).toLocaleDateString()}</span>}
                    {sample?.collection_date && (
                      <span>Collected: {new Date(sample.collection_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {pendingCount > 0 && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {pendingCount} pending
                    </span>
                  )}
                  {enteredCount > 0 && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
                      {enteredCount} entered
                    </span>
                  )}
                  {allDone && (
                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Complete
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
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {tests.map(st => <ResultRow key={st.id} st={st} />)}
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
