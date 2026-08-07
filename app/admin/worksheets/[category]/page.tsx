import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import WorksheetEntryForm from '@/components/worksheets/WorksheetEntryForm'
import type { WorksheetRow } from '@/components/worksheets/WorksheetEntryForm'

interface Props {
  params: Promise<{ category: string }>
}

export default async function WorksheetCategoryPage({ params }: Props) {
  const { category } = await params

  if (!['chemistry', 'microbiology'].includes(category)) notFound()

  const supabase = await createClient()

  const { data: rawRows, error } = await supabase
    .from('sample_tests')
    .select(`
      id,
      status,
      result,
      unit,
      qualifier,
      mdl,
      dilution_factor,
      analyst_notes,
      tests!inner (
        id,
        name,
        category,
        unit,
        method
      ),
      samples!inner (
        id,
        sample_id,
        matrix_type,
        collection_date,
        orders!inner (
          id,
          order_number
        )
      )
    `)
    .eq('status', 'pending')
    .eq('tests.category', category)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  // Normalize: supabase returns joined relations as arrays with !inner
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: WorksheetRow[] = (rawRows ?? []).map((r: any) => {
    const test = Array.isArray(r.tests) ? r.tests[0] : r.tests
    const sample = Array.isArray(r.samples) ? r.samples[0] : r.samples
    const order = sample && Array.isArray(sample.orders) ? sample.orders[0] : sample?.orders
    return {
      id: r.id,
      status: r.status,
      result: r.result,
      unit: r.unit,
      qualifier: r.qualifier,
      mdl: r.mdl,
      dilution_factor: r.dilution_factor,
      analyst_notes: r.analyst_notes,
      tests: { id: test.id, name: test.name, category: test.category, unit: test.unit, method: test.method },
      samples: {
        id: sample.id,
        sample_id: sample.sample_id,
        matrix_type: sample.matrix_type,
        collection_date: sample.collection_date,
        orders: { id: order.id, order_number: order.order_number },
      },
    }
  })

  return (
    <div className="p-6 max-w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 capitalize">{category} Worksheet</h1>
        <p className="text-slate-500 text-sm mt-1">
          {rows.length} pending {category} tests — enter results row by row
        </p>
      </div>

      <WorksheetEntryForm rows={rows} category={category} />
    </div>
  )
}
