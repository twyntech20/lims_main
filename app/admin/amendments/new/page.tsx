import { createClient } from '@/lib/supabase/server'
import { createAmendment } from '@/app/actions/amendments'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewAmendmentPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, status')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/amendments"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Amendments
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Request Amendment</h1>
        <p className="text-slate-500 text-sm mt-1">Submit a request to amend an order or result</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <form action={createAmendment} className="space-y-5">
          {/* Order */}
          <div>
            <label htmlFor="order_id" className="block text-sm font-medium text-slate-700 mb-1.5">
              Order <span className="text-red-500">*</span>
            </label>
            <select
              id="order_id"
              name="order_id"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an order…</option>
              {orders?.map(o => (
                <option key={o.id} value={o.id}>
                  {o.order_number}{o.customer_name ? ` — ${o.customer_name}` : ''} ({o.status})
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              id="reason"
              name="reason"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason…</option>
              <option value="COC Correction">COC Correction</option>
              <option value="Result Correction">Result Correction</option>
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
              id="description"
              name="description"
              required
              rows={5}
              placeholder="Describe what needs to be changed and why…"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/admin/amendments"
              className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm text-sm"
            >
              Submit Amendment Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
