import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FolderKanban, Pencil } from 'lucide-react'

interface SearchParams { search?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function ProjectsPage({ searchParams }: Props) {
  const { search } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select('id, project_name, project_no, project_code, project_man, date_receive, date_complete, created_at')
    .order('project_name')

  if (search) {
    query = query.or(
      `project_name.ilike.%${search}%,project_no.ilike.%${search}%,project_code.ilike.%${search}%,project_man.ilike.%${search}%`
    )
  }

  const { data: projects } = await query

  const projectList = projects ?? []

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">
            {projectList.length} project{projectList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" /> Add Project
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3">
        <form className="flex flex-wrap gap-3 w-full">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search name, number, code, manager…"
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-48"
          />
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition"
          >
            Filter
          </button>
          {search && (
            <Link
              href="/admin/projects"
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <FolderKanban className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900">All Projects</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-blue-50 text-blue-700 border-blue-100">
            {projectList.length} projects
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Manager</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date Received</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date Complete</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projectList.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{project.project_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 font-mono">{project.project_no ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 font-mono">{project.project_code ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{project.project_man ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{project.date_receive ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{project.date_complete ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {project.created_at
                      ? new Date(project.created_at).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition inline-flex"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {projectList.length === 0 && (
          <div className="p-16 text-center">
            <FolderKanban className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No projects found</p>
            <Link href="/admin/projects/new" className="mt-3 inline-block text-blue-600 text-sm hover:underline">
              Add your first project
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
