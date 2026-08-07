'use client'

import { useTransition } from 'react'
import { updateTest, deleteTest } from '@/app/actions/tests'
import { Loader2, Trash2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL = 'block text-sm font-medium text-slate-700 mb-1.5'

interface Test {
  id: string; name: string; code: string | null; category: string
  method: string | null; unit: string | null; turnaround_days: number | null; is_active: boolean
}

export default function EditTestForm({ test }: { test: Test }) {
  const [saving, startSave]     = useTransition()
  const [deleting, startDelete] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startSave(async () => {
      try {
        await updateTest(formData)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Failed to update test')
      }
    })
  }

  function handleDelete() {
    if (!confirm(`Delete "${test.name}"? This cannot be undone.`)) return
    startDelete(async () => {
      try {
        await deleteTest(test.id)
        toast.success('Test deleted')
        router.push('/admin/tests')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to delete test')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Toaster position="top-center" />
      <input type="hidden" name="id" value={test.id} />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Test Details</h2>

        <div>
          <label className={LABEL}>Test Name <span className="text-red-500">*</span></label>
          <input name="name" required defaultValue={test.name} className={INPUT} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Code</label>
            <input name="code" defaultValue={test.code ?? ''} placeholder="e.g. TC-MF" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Category <span className="text-red-500">*</span></label>
            <select name="category" required defaultValue={test.category} className={INPUT}>
              <option value="chemistry">Chemistry</option>
              <option value="microbiology">Microbiology</option>
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL}>Method</label>
          <input name="method" defaultValue={test.method ?? ''} placeholder="e.g. SM 9222B" className={INPUT} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Unit</label>
            <input name="unit" defaultValue={test.unit ?? ''} placeholder="e.g. mg/L" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Turnaround Time (days)</label>
            <input name="turnaround_days" type="number" min="1" max="30"
              defaultValue={test.turnaround_days ?? 5} className={INPUT} />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="hidden" name="is_active" value="false" />
            <input type="checkbox" name="is_active" value="true"
              defaultChecked={test.is_active} className="rounded accent-blue-600 w-4 h-4" />
            <div>
              <p className="text-sm font-medium text-slate-700">Active</p>
              <p className="text-xs text-slate-400">Inactive tests won't appear in COC analysis selection</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between pb-6">
        <button type="button" onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-medium transition disabled:opacity-50">
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting…' : 'Delete Test'}
        </button>
        <div className="flex gap-3">
          <Link href="/admin/tests" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
