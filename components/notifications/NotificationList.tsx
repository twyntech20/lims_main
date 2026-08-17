'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { markNotificationRead, markAllNotificationsRead } from '@/app/actions/notifications'
import {
  Bell, CheckCheck, ClipboardCheck, Undo2, CheckCircle2, Package,
  AlertTriangle, Loader2, Inbox, GitPullRequestArrow, FileEdit,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { formatDateTime } from '@/lib/utils'
import { waitingTime } from '@/lib/workflow'

export interface NotificationRow {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

// One icon per notification type on the existing enum, including the
// workflow types added for the result lifecycle.
const TYPE_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  review_assigned:     { icon: ClipboardCheck,       color: 'text-blue-600 bg-blue-50' },
  result_returned:     { icon: Undo2,                color: 'text-red-600 bg-red-50' },
  result_approved:     { icon: CheckCircle2,         color: 'text-green-600 bg-green-50' },
  result_released:     { icon: Package,              color: 'text-emerald-600 bg-emerald-50' },
  review_overdue:      { icon: AlertTriangle,        color: 'text-orange-600 bg-orange-50' },
  overdue_alert:       { icon: AlertTriangle,        color: 'text-orange-600 bg-orange-50' },
  order_submitted:     { icon: Inbox,                color: 'text-slate-600 bg-slate-100' },
  order_assigned:      { icon: FileEdit,             color: 'text-blue-600 bg-blue-50' },
  order_completed:     { icon: Package,              color: 'text-green-600 bg-green-50' },
  result_entered:      { icon: FileEdit,             color: 'text-yellow-600 bg-yellow-50' },
  amendment_requested: { icon: GitPullRequestArrow,  color: 'text-purple-600 bg-purple-50' },
  general:             { icon: Bell,                 color: 'text-slate-600 bg-slate-100' },
}

export default function NotificationList({ rows }: { rows: NotificationRow[] }) {
  const [pending, startTransition] = useTransition()
  const unread = rows.filter(r => !r.is_read).length

  function handleMarkAll() {
    startTransition(async () => {
      try {
        await markAllNotificationsRead()
        toast.success('All marked as read')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed')
      }
    })
  }

  function handleMarkOne(id: string) {
    startTransition(async () => {
      try {
        await markNotificationRead(id)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed')
      }
    })
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notifications
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {unread} unread · {rows.length} total
          </p>
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAll} disabled={pending}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Mark all read
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
          <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nothing to catch up on</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {rows.map(n => {
            const { icon: Icon, color } = TYPE_ICON[n.type] ?? TYPE_ICON.general
            const body = (
              <div className={`flex items-start gap-3 px-5 py-4 transition ${n.is_read ? 'bg-white' : 'bg-blue-50/40'}`}>
                <div className={`p-2 rounded-xl shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${n.is_read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>
                      {n.title}
                    </p>
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1" title={formatDateTime(n.created_at)}>
                    {waitingTime(n.created_at)} ago
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={e => { e.preventDefault(); handleMarkOne(n.id) }}
                    disabled={pending}
                    className="text-xs text-slate-400 hover:text-slate-700 transition shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            )

            return n.link
              ? <Link key={n.id} href={n.link} className="block hover:bg-slate-50 transition">{body}</Link>
              : <div key={n.id}>{body}</div>
          })}
        </div>
      )}
    </>
  )
}
