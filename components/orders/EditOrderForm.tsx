'use client'

import { useTransition } from 'react'
import { updateOrder } from '@/app/actions/orders'
import Link from 'next/link'

interface Client {
  id: string
  client_name: string
  email: string | null
  phone: string | null
}

interface Props {
  order: Record<string, any>
  clients: Client[]
}

const INPUT_CLS =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL_CLS = 'block text-sm font-medium text-slate-700 mb-1.5'

function parseCoc(notes: string | null): Record<string, string> {
  if (!notes) return {}
  try { return JSON.parse(notes) } catch { return {} }
}

export default function EditOrderForm({ order, clients }: Props) {
  const [isPending, startTransition] = useTransition()
  const coc = parseCoc(order.notes)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => { updateOrder(formData) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="id" value={order.id} />

      {/* ── Client & Project ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Client &amp; Project</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Client</label>
            <select name="client_id" defaultValue={order.client_id ?? ''} className={INPUT_CLS}>
              <option value="">— Select client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.client_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Status</label>
            <select name="status" defaultValue={order.status ?? 'new'} className={INPUT_CLS}>
              {['new', 'submitted', 'in_progress', 'review', 'completed', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Priority</label>
            <select name="priority" defaultValue={order.priority ?? 'normal'} className={INPUT_CLS}>
              <option value="normal">Normal</option>
              <option value="same_day">Same Day</option>
              <option value="priority_24h">24 Hour</option>
              <option value="priority_48h">48 Hour</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Customer Name</label>
            <input name="customer_name" defaultValue={order.customer_name ?? ''} className={INPUT_CLS} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Customer Email</label>
            <input type="email" name="customer_email" defaultValue={order.customer_email ?? ''} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Customer Phone</label>
            <input type="tel" name="customer_phone" defaultValue={order.customer_phone ?? ''} className={INPUT_CLS} />
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Shipping Address</label>
          <input name="shipping_address" defaultValue={order.shipping_address ?? ''} className={INPUT_CLS} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Project Name</label>
            <input name="project_name" defaultValue={coc.project_name ?? ''} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Project Number</label>
            <input name="project_number" defaultValue={coc.project_number ?? ''} className={INPUT_CLS} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>P.O. Number</label>
            <input name="po_number" defaultValue={coc.po_number ?? ''} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Project Manager</label>
            <input name="project_manager" defaultValue={coc.project_manager ?? ''} className={INPUT_CLS} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Fax No.</label>
            <input name="fax_no" defaultValue={coc.fax_no ?? ''} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Sampler Name</label>
            <input name="sampler_name" defaultValue={coc.sampler_name ?? ''} className={INPUT_CLS} />
          </div>
        </div>
      </div>

      {/* ── TAT & Dates ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">TAT &amp; Dates</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Date Received</label>
            <input
              type="datetime-local"
              name="date_received"
              defaultValue={order.date_received ? order.date_received.slice(0, 16) : ''}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Due Date</label>
            <input
              type="datetime-local"
              name="date_due"
              defaultValue={order.date_due ? order.date_due.slice(0, 16) : ''}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* ── Shipment Info ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Shipment Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Airbill No.</label>
            <input name="airbill_no" defaultValue={coc.airbill_no ?? ''} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Cooler No.</label>
            <input name="cooler_no" defaultValue={coc.cooler_no ?? ''} className={INPUT_CLS} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Sample Temp (°C)</label>
            <input name="sample_temp" defaultValue={coc.sample_temp ?? ''} className={INPUT_CLS} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Remarks</label>
          <textarea name="remarks" defaultValue={coc.remarks ?? ''} rows={2} className={INPUT_CLS + ' resize-none'} />
        </div>
      </div>

      {/* ── Chain of Custody transfers ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Chain of Custody</h2>
        {[1, 2].map((n) => (
          <div key={n} className="border border-slate-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Transfer {n}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-600">Relinquished By</p>
                <input name={`relinquished_by_${n}`} defaultValue={coc[`relinquished_by_${n}`] ?? ''} placeholder="Name" className={INPUT_CLS} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" name={`relinquished_date_${n}`} defaultValue={coc[`relinquished_date_${n}`] ?? ''} className={INPUT_CLS} />
                  <input type="time" name={`relinquished_time_${n}`} defaultValue={coc[`relinquished_time_${n}`] ?? ''} className={INPUT_CLS} />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-600">Received By</p>
                <input name={`received_by_${n}`} defaultValue={coc[`received_by_${n}`] ?? ''} placeholder="Name" className={INPUT_CLS} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" name={`received_date_${n}`} defaultValue={coc[`received_date_${n}`] ?? ''} className={INPUT_CLS} />
                  <input type="time" name={`received_time_${n}`} defaultValue={coc[`received_time_${n}`] ?? ''} className={INPUT_CLS} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Compliance & Disposition ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Compliance &amp; Disposition</h2>

        <div>
          <label className={LABEL_CLS}>Compliance Drinking Water?</label>
          <select name="is_compliance_drinking_water" defaultValue={String(coc.is_compliance_drinking_water ?? '')} className={INPUT_CLS}>
            <option value="">— Select —</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        <div>
          <label className={LABEL_CLS}>Samples Returned to Client?</label>
          <select name="samples_returned_to_client" defaultValue={String(coc.samples_returned_to_client ?? '')} className={INPUT_CLS}>
            <option value="">— Select —</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Storage Days Requested</label>
            <input type="number" name="storage_days" defaultValue={coc.storage_days ?? ''} min="1" className={INPUT_CLS} />
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Special Instructions</label>
          <textarea name="special_instructions" defaultValue={coc.special_instructions ?? ''} rows={3} className={INPUT_CLS + ' resize-none'} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Sign &amp; Print Name</label>
            <input name="sign_print" defaultValue={coc.sign_print ?? ''} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Sign Date</label>
            <input type="date" name="sign_date" defaultValue={coc.sign_date ?? ''} className={INPUT_CLS} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pb-8">
        <Link
          href={`/admin/orders/${order.id}`}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
