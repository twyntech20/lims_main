import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AmendmentRequestForm, { type AmendableOrder, type AmendableResult } from '@/components/amendments/AmendmentRequestForm'

export default async function NewAmendmentPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, order_number, customer_name, status,
      samples ( sample_id, sample_tests (
        id, status, result, unit, qualifier, mdl, dilution_factor,
        tests ( name )
      ) )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const orderOptions: AmendableOrder[] = (orders ?? []).map(o => ({
    id: o.id,
    label: `${o.order_number}${o.customer_name ? ` — ${o.customer_name}` : ''} (${o.status})`,
  }))

  // Only an approved result is a controlled record that needs an amendment
  // to change — anything earlier is still editable in the work queue.
  const resultOptions: AmendableResult[] = (orders ?? []).flatMap((o: any) =>
    (o.samples ?? []).flatMap((s: any) =>
      (s.sample_tests ?? [])
        .filter((st: any) => st.status === 'approved')
        .map((st: any) => ({
          id: st.id,
          orderId: o.id,
          label: `${s.sample_id} · ${st.tests?.name ?? 'test'}`,
          result: st.result,
          unit: st.unit,
          qualifier: st.qualifier,
          mdl: st.mdl,
          dilutionFactor: st.dilution_factor,
        })),
    ),
  )

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
        <p className="text-slate-500 text-sm mt-1">Submit a request to amend an order or an approved result</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <AmendmentRequestForm orders={orderOptions} results={resultOptions} />
      </div>
    </div>
  )
}
