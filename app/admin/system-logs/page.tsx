import { createClient } from '@/lib/supabase/server'
import { ScrollText } from 'lucide-react'

interface SearchParams { action?: string; page?: string }
interface Props { searchParams: Promise<SearchParams> }

const PAGE_SIZE = 50

export default async function SystemLogsPage({ searchParams }: Props) {
  const { action, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))

  const supabase = await createClient()

  // Get distinct actions for filter
  const { data: allLogs } = await supabase
    .from('audit_logs')
    .select('action')
    .limit(200)

  const actionTypes = [...new Set((allLogs ?? []).map(l => l.action).filter(Boolean))].sort()

  // Query with filter and pagination
  let query = supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      table_name,
      record_id,
      new_values,
      ip_address,
      created_at,
      profiles (
        first_name,
        last_name,
        email
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (action) query = query.eq('action', action)

  const { data: logs, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (action) params.set('action', action)
    params.set('page', String(p))
    return `/admin/system-logs?${params.toString()}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-slate-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Logs</h1>
            <p className="text-slate-500 text-sm mt-0.5">{count ?? 0} audit events recorded</p>
          </div>
        </div>

        {/* Filter */}
        <form className="flex items-center gap-2">
          <select
            name="action"
            defaultValue={action ?? ''}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All actions</option>
            {actionTypes.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition"
          >
            Filter
          </button>
          {action && (
            <a href="/admin/system-logs" className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition">
              Clear
            </a>
          )}
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {!logs?.length ? (
          <div className="p-16 text-center">
            <ScrollText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No logs yet</p>
            <p className="text-slate-300 text-xs mt-1">System activity will appear here as users interact with the platform.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Timestamp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entity Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entity ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => {
                    const profile = log.profiles as { first_name?: string; last_name?: string; email?: string } | null
                    const userName = profile
                      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || '—'
                      : '—'
                    const details = log.new_values
                      ? JSON.stringify(log.new_values).slice(0, 80)
                      : null
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-2.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-slate-700 whitespace-nowrap">{userName}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                            {log.action ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-slate-500">{log.table_name ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-slate-400 max-w-[120px] truncate" title={log.record_id ?? ''}>
                          {log.record_id ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-400 max-w-xs truncate font-mono" title={details ?? ''}>
                          {details ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-slate-400 whitespace-nowrap">
                          {log.ip_address ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Page {page} of {totalPages} · {count} total logs
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <a
                      href={pageHref(page - 1)}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
                    >
                      Previous
                    </a>
                  )}
                  {page < totalPages && (
                    <a
                      href={pageHref(page + 1)}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
                    >
                      Next
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
