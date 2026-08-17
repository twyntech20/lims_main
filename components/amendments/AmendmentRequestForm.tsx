'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createAmendment } from '@/app/actions/amendments'
import { MIN_COMMENT_LENGTH } from '@/lib/workflow'

export interface AmendableResult {
  id: string
  orderId: string
  label: string          // "SAMPLE-01 · Total Coliform"
  result: string | null
  unit: string | null
  qualifier: string | null
  mdl: string | null
  dilutionFactor: number | null
}

export interface AmendableOrder {
  id: string
  label: string
}

const FIELD = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const SMALL = 'w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function AmendmentRequestForm({
  orders,
  results,
}: {
  orders: AmendableOrder[]
  results: AmendableResult[]
}) {
  const [orderId, setOrderId] = useState('')
  const [sampleTestId, setSampleTestId] = useState('')

  const orderResults = results.filter(r => r.orderId === orderId)
  const target = orderResults.find(r => r.id === sampleTestId)

  return (
    <form action={createAmendment} className="space-y-5">
      {/* Order */}
      <div>
        <label htmlFor="order_id" className="block text-sm font-medium text-slate-700 mb-1.5">
          Order <span className="text-red-500">*</span>
        </label>
        <select
          id="order_id" name="order_id" required value={orderId}
          onChange={e => { setOrderId(e.target.value); setSampleTestId('') }}
          className={FIELD}
        >
          <option value="">Select an order…</option>
          {orders.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      {/* Optional: the specific approved result being corrected */}
      <div>
        <label htmlFor="sample_test_id" className="block text-sm font-medium text-slate-700 mb-1.5">
          Result to correct
        </label>
        <select
          id="sample_test_id" name="sample_test_id" value={sampleTestId}
          onChange={e => setSampleTestId(e.target.value)}
          disabled={!orderId}
          className={`${FIELD} disabled:opacity-50`}
        >
          <option value="">None — this amendment is about the order itself</option>
          {orderResults.map(r => (
            <option key={r.id} value={r.id}>
              {r.label} (currently {r.qualifier === 'ND' ? 'ND' : [r.qualifier, r.result].filter(Boolean).join(' ') || '—'} {r.unit ?? ''})
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1.5">
          {orderId && orderResults.length === 0
            ? 'This order has no approved results to correct.'
            : 'Pick a result to change an approved value. On approval the correction is applied and the result goes back through review.'}
        </p>
      </div>

      {/* Corrected values — only meaningful with a target result */}
      {target && (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Corrected values</p>
          <p className="text-xs text-slate-500">
            Leave a field blank to keep its current value. The value being replaced is recorded on the
            amendment when it is applied.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Result (now {target.result ?? '—'})</label>
              <input name="new_result" placeholder={target.result ?? '0.00'} className={SMALL} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Unit (now {target.unit ?? '—'})</label>
              <input name="new_unit" placeholder={target.unit ?? 'unit'} className={SMALL} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Qualifier (now {target.qualifier ?? '—'})</label>
              <select name="new_qualifier" defaultValue="" className={SMALL}>
                <option value="">Unchanged</option>
                <option value="ND">ND</option>
                <option value="&lt;">{'<'}</option>
                <option value="&gt;">{'>'}</option>
                <option value="B">B</option>
                <option value="E">E</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">MDL (now {target.mdl ?? '—'})</label>
              <input name="new_mdl" placeholder={target.mdl ?? 'MDL'} className={SMALL} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Dilution (now {target.dilutionFactor ?? 1})
              </label>
              <input name="new_dilution_factor" type="number" min="0" step="0.1"
                placeholder={String(target.dilutionFactor ?? 1)} className={SMALL} />
            </div>
          </div>
        </div>
      )}

      {/* Reason */}
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1.5">
          Reason <span className="text-red-500">*</span>
        </label>
        <select id="reason" name="reason" required className={FIELD}>
          <option value="">Select a reason…</option>
          <option value="COC Correction">COC Correction</option>
          <option value="Result Correction">Result Correction</option>
          <option value="Transcription Error">Transcription Error</option>
          <option value="Re-analysis">Re-analysis</option>
          <option value="Sample ID Change">Sample ID Change</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description" name="description" required rows={5}
          minLength={MIN_COMMENT_LENGTH}
          placeholder={`Describe what needs to be changed and why (at least ${MIN_COMMENT_LENGTH} characters)…`}
          className={`${FIELD} resize-none`}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/admin/amendments"
          className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition">
          Cancel
        </Link>
        <button type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm text-sm">
          Submit Amendment Request
        </button>
      </div>
    </form>
  )
}
