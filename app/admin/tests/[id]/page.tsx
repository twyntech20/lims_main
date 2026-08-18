import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditTestForm from '@/components/tests/EditTestForm'

interface Props { params: Promise<{ id: string }> }

export default async function EditTestPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: test, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !test) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/tests" className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Test</h1>
          <p className="text-slate-500 text-sm">{test.name}</p>
        </div>
      </div>

      <EditTestForm test={test} />

      {test.catalog_source && <CatalogSpec test={test} />}
    </div>
  )
}

/**
 * The analysis exactly as the source workbook states it. Read-only: these
 * fields come from the Master List of Analyses and are refreshed by the
 * catalog import, not edited here.
 */
function CatalogSpec({ test }: { test: Record<string, any> }) {
  const rows: [string, string | null][] = [
    ['Matrix',            test.matrix],
    ['Units (all matrices)', test.unit_options],
    ['MDL',               test.mdl],
    ['Result type',       test.result_type],
    ['Volume needed',     test.volume_required],
    ['Storage temperature', test.storage_temp],
    ['Holding time',      test.holding_time],
    ['Incubation',        test.incubation],
    ['Preservative',      test.preservative],
    ['TAT (general)',     test.tat_general],
    ['TAT (rush)',        test.tat_rush],
    ['Notes',             test.catalog_notes],
  ]
  const present = rows.filter(([, v]) => v)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-slate-900">Catalog specification</h2>
        {test.subcontracted && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
            Sent to sub-lab
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-4">Source: {test.catalog_source}</p>

      {present.length === 0 ? (
        <p className="text-sm text-slate-400">The workbook lists this analysis but states no further detail.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {present.map(([label, value]) => (
            <div key={label}>
              <dt className="text-slate-500 text-xs">{label}</dt>
              <dd className="text-slate-900 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {test.tat_matches_legacy === false && (
        <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          The scheduling value <span className="font-semibold">turnaround_days = {test.turnaround_days}</span> pre-dates
          this workbook and sits outside its stated TAT of{' '}
          <span className="font-semibold">{test.tat_general}</span>. The workbook value is authoritative; the legacy
          number is kept unchanged for backward compatibility.
        </p>
      )}

      {!test.reference_range && (
        <p className="mt-3 text-xs text-slate-400">
          No reference range — the source workbook does not define one for any analysis.
        </p>
      )}
    </div>
  )
}
