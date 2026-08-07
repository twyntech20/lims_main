import { createTest } from '@/app/actions/tests'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function NewTestPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/tests" className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Test</h1>
          <p className="text-slate-500 text-sm">Add a new analysis to the catalog</p>
        </div>
      </div>

      <form action={createTest} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Test Details</h2>

          <div>
            <label className={LABEL}>Test Name <span className="text-red-500">*</span></label>
            <input name="name" required placeholder="e.g. Total Coliform (MF)" className={INPUT} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Code</label>
              <input name="code" placeholder="e.g. TC-MF" className={INPUT} />
              <p className="text-xs text-slate-400 mt-1">Short unique identifier</p>
            </div>
            <div>
              <label className={LABEL}>Category <span className="text-red-500">*</span></label>
              <select name="category" required className={INPUT}>
                <option value="">Select category…</option>
                <option value="chemistry">Chemistry</option>
                <option value="microbiology">Microbiology</option>
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL}>Method</label>
            <input name="method" placeholder="e.g. SM 9222B, EPA 353.1" className={INPUT} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Unit</label>
              <input name="unit" placeholder="e.g. CFU/100mL, mg/L" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Turnaround Time (days)</label>
              <input name="turnaround_days" type="number" min="1" max="30" defaultValue="5" className={INPUT} />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="hidden" name="is_active" value="false" />
              <input type="checkbox" name="is_active" value="true" defaultChecked className="rounded accent-blue-600 w-4 h-4" />
              <div>
                <p className="text-sm font-medium text-slate-700">Active</p>
                <p className="text-xs text-slate-400">Inactive tests won't appear in COC analysis selection</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 justify-end pb-6">
          <Link href="/admin/tests" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
            Cancel
          </Link>
          <button type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm">
            Add Test
          </button>
        </div>
      </form>
    </div>
  )
}
