import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PrintButton from '@/components/reports/PrintButton'
import LabReportView from '@/components/reports/LabReportView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AnalystReportPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      date_completed,
      released_at,
      released_by_profile:profiles!orders_released_by_fkey ( first_name, last_name, email ),
      date_received,
      assigned_analyst_id,
      profiles!orders_assigned_analyst_id_fkey ( first_name, last_name, email ),
      clients ( client_name, email, phone, address ),
      samples (
        id,
        sample_id,
        matrix_type,
        collection_date,
        sample_tests (
          id,
          status,
          result,
          unit,
          qualifier,
          mdl,
          analyst_notes,
          approved_at,
          tests ( id, name, code, method, unit, category, reference_range ),
          entered_by_profile:profiles!sample_tests_entered_by_fkey ( first_name, last_name, email ),
          approved_by_profile:profiles!sample_tests_approved_by_fkey ( first_name, last_name, email )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()
  // Analysts may only pull the report for orders they were assigned —
  // this is a report of their own work, not a general admin lookup.
  if (order.assigned_analyst_id !== user.id) redirect('/analyst/work-queue')

  return (
    <>
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
          .print-page { padding: 32px; }
        }
      `}</style>

      <div className="p-6 max-w-4xl mx-auto print-page">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link
            href={`/analyst/orders/${order.id}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Order
          </Link>
          <PrintButton orderId={order.id} />
        </div>

        <LabReportView order={order as any} />
      </div>
    </>
  )
}
