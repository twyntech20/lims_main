import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Layers, FlaskConical, Microscope } from 'lucide-react'

export default async function WorksheetsPage() {
  const supabase = await createClient()

  // Count pending sample_tests by test category
  const { data: chemPending } = await supabase
    .from('sample_tests')
    .select('id, tests!inner(category)', { count: 'exact' })
    .eq('status', 'pending')
    .eq('tests.category', 'chemistry')

  const { data: microPending } = await supabase
    .from('sample_tests')
    .select('id, tests!inner(category)', { count: 'exact' })
    .eq('status', 'pending')
    .eq('tests.category', 'microbiology')

  const chemCount = chemPending?.length ?? 0
  const microCount = microPending?.length ?? 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Layers className="w-6 h-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Worksheets</h1>
          <p className="text-slate-500 text-sm mt-0.5">Batch result entry by test category</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chemistry */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Chemistry</h2>
              <p className="text-slate-500 text-sm">Chemical analysis tests</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <span className="text-3xl font-bold text-blue-600">{chemCount}</span>
            <p className="text-slate-500 text-sm mt-1">tests pending result entry</p>
          </div>

          <Link
            href="/admin/worksheets/chemistry"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
          >
            Open Chemistry Worksheet
          </Link>
        </div>

        {/* Microbiology */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Microscope className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Microbiology</h2>
              <p className="text-slate-500 text-sm">Microbiological analysis tests</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <span className="text-3xl font-bold text-green-600">{microCount}</span>
            <p className="text-slate-500 text-sm mt-1">tests pending result entry</p>
          </div>

          <Link
            href="/admin/worksheets/microbiology"
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
          >
            Open Microbiology Worksheet
          </Link>
        </div>
      </div>
    </div>
  )
}
