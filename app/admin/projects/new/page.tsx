import { createProject } from '@/app/actions/projects'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function NewProjectPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/projects" className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Project</h1>
          <p className="text-slate-500 text-sm">Create a new project record</p>
        </div>
      </div>

      <form action={createProject} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Project Details</h2>

          <div>
            <label className={LABEL}>Project Name <span className="text-red-500">*</span></label>
            <input name="project_name" required placeholder="e.g. Municipal Water Quality Study" className={INPUT} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Project Number</label>
              <input name="project_no" placeholder="e.g. PRJ-2024-001" className={INPUT} />
              <p className="text-xs text-slate-400 mt-1">Unique project identifier</p>
            </div>
            <div>
              <label className={LABEL}>Project Code</label>
              <input name="project_code" placeholder="e.g. MWQ-24" className={INPUT} />
              <p className="text-xs text-slate-400 mt-1">Short code for reference</p>
            </div>
          </div>

          <div>
            <label className={LABEL}>Project Manager</label>
            <input name="project_man" placeholder="e.g. Jane Smith" className={INPUT} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Date Received</label>
              <input name="date_receive" type="date" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Date Complete</label>
              <input name="date_complete" type="date" className={INPUT} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pb-6">
          <Link href="/admin/projects" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
            Cancel
          </Link>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm"
          >
            Add Project
          </button>
        </div>
      </form>
    </div>
  )
}
