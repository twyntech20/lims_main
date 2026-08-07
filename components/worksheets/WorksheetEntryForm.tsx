'use client'

import { useState } from 'react'
import { enterResultsBatch } from '@/app/actions/results'
import { Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export interface WorksheetRow {
  id: string
  status: string
  result: string | null
  unit: string | null
  qualifier: string | null
  mdl: string | null
  dilution_factor: number | null
  analyst_notes: string | null
  tests: Test
  samples: Sample
}

interface Test {
  id: string
  name: string
  category: string
  unit: string | null
  method: string | null
}

interface Sample {
  id: string
  sample_id: string
  matrix_type: string | null
  collection_date: string | null
  orders: {
    id: string
    order_number: string
  }
}

interface RowState {
  result: string
  unit: string
  qualifier: string
  mdl: string
  analyst_notes: string
  saving: boolean
  saved: boolean
  error: string | null
}

interface Props {
  rows: WorksheetRow[]
  category: string
}

export default function WorksheetEntryForm({ rows, category }: Props) {
  const [states, setStates] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {}
    for (const row of rows as WorksheetRow[]) {
      init[row.id] = {
        result: row.result ?? '',
        unit: row.unit ?? row.tests.unit ?? '',
        qualifier: row.qualifier ?? '',
        mdl: row.mdl ?? '',
        analyst_notes: row.analyst_notes ?? '',
        saving: false,
        saved: false,
        error: null,
      }
    }
    return init
  })

  function update(id: string, field: keyof RowState, value: string | boolean | null) {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function saveRow(row: WorksheetRow) {
    const s = states[row.id]
    update(row.id, 'saving', true)
    update(row.id, 'error', null)
    update(row.id, 'saved', false)
    try {
      await enterResultsBatch(row.id, {
        result: s.result || null,
        unit: s.unit || null,
        qualifier: s.qualifier || null,
        mdl: s.mdl || null,
        dilution_factor: null,
        analyst_notes: s.analyst_notes || null,
      })
      setStates(prev => ({
        ...prev,
        [row.id]: { ...prev[row.id], saving: false, saved: true, error: null },
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setStates(prev => ({
        ...prev,
        [row.id]: { ...prev[row.id], saving: false, saved: false, error: msg },
      }))
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
        <p className="text-slate-400 text-sm font-medium">No pending {category} tests</p>
        <p className="text-slate-300 text-xs mt-1">All caught up!</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Order #</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Sample ID</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Collected</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Test Name</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-28">Result</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-20">Unit</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-20">Qualifier</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-20">MDL</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-40">Analyst Notes</th>
              <th className="px-3 py-2 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const s = states[row.id]
              const collDate = row.samples.collection_date
                ? new Date(row.samples.collection_date).toLocaleDateString()
                : '—'
              return (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-50/50 transition ${s.saved ? 'bg-green-50/40' : ''}`}
                >
                  <td className="px-3 py-1.5 font-mono text-slate-700 whitespace-nowrap">
                    {row.samples.orders.order_number}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-slate-600 whitespace-nowrap">
                    {row.samples.sample_id}
                  </td>
                  <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{collDate}</td>
                  <td className="px-3 py-1.5 text-slate-700 whitespace-nowrap">{row.tests.name}</td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={s.result}
                      onChange={e => update(row.id, 'result', e.target.value)}
                      placeholder="Enter result"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={s.unit}
                      onChange={e => update(row.id, 'unit', e.target.value)}
                      placeholder="Unit"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      value={s.qualifier}
                      onChange={e => update(row.id, 'qualifier', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">—</option>
                      <option value="ND">ND</option>
                      <option value="<">&lt;</option>
                      <option value=">">&gt;</option>
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={s.mdl}
                      onChange={e => update(row.id, 'mdl', e.target.value)}
                      placeholder="MDL"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={s.analyst_notes}
                      onChange={e => update(row.id, 'analyst_notes', e.target.value)}
                      placeholder="Notes…"
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {s.error && (
                      <span title={s.error}>
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 inline mr-1" />
                      </span>
                    )}
                    {s.saved ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 inline" />
                    ) : (
                      <button
                        onClick={() => saveRow(row)}
                        disabled={s.saving}
                        className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded px-2 py-1 text-xs font-medium transition"
                      >
                        {s.saving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Save
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
