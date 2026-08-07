'use client'

import { useTransition } from 'react'
import { updateProject, deleteProject } from '@/app/actions/projects'
import { Loader2, Trash2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL = 'block text-sm font-medium text-slate-700 mb-1.5'

interface Project {
  id: string
  project_name: string
  project_no: string | null
  project_code: string | null
  project_man: string | null
  date_receive: string | null
  date_complete: string | null
}

export default function EditProjectForm({ project }: { project: Project }) {
  const [saving, startSave]     = useTransition()
  const [deleting, startDelete] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startSave(async () => {
      try {
        await updateProject(formData)
      } catch (err: unknown) {
        const error = err as { digest?: string; message?: string }
        if (error?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(error.message ?? 'Failed to update project')
      }
    })
  }

  function handleDelete() {
    if (!confirm(`Delete "${project.project_name}"? This cannot be undone.`)) return
    startDelete(async () => {
      try {
        await deleteProject(project.id)
        toast.success('Project deleted')
        router.push('/admin/projects')
      } catch (err: unknown) {
        const error = err as { message?: string }
        toast.error(error.message ?? 'Failed to delete project')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Toaster position="top-center" />
      <input type="hidden" name="id" value={project.id} />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Project Details</h2>

        <div>
          <label className={LABEL}>Project Name <span className="text-red-500">*</span></label>
          <input name="project_name" required defaultValue={project.project_name} className={INPUT} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Project Number</label>
            <input name="project_no" defaultValue={project.project_no ?? ''} placeholder="e.g. PRJ-2024-001" className={INPUT} />
            <p className="text-xs text-slate-400 mt-1">Unique project identifier</p>
          </div>
          <div>
            <label className={LABEL}>Project Code</label>
            <input name="project_code" defaultValue={project.project_code ?? ''} placeholder="e.g. MWQ-24" className={INPUT} />
            <p className="text-xs text-slate-400 mt-1">Short code for reference</p>
          </div>
        </div>

        <div>
          <label className={LABEL}>Project Manager</label>
          <input name="project_man" defaultValue={project.project_man ?? ''} placeholder="e.g. Jane Smith" className={INPUT} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Date Received</label>
            <input name="date_receive" type="date" defaultValue={project.date_receive ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Date Complete</label>
            <input name="date_complete" type="date" defaultValue={project.date_complete ?? ''} className={INPUT} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pb-6">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-medium transition disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting…' : 'Delete Project'}
        </button>
        <div className="flex gap-3">
          <Link href="/admin/projects" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
