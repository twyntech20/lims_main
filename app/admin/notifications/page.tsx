import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationList from '@/components/notifications/NotificationList'
import { Page, PageHeader } from '@/components/ui/primitives'
import { Bell } from 'lucide-react'

export default async function AdminNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, message, link, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (notifications ?? []) as any[]
  const unread = rows.filter(n => !n.is_read).length

  return (
    <Page narrow>
      <PageHeader
        icon={Bell}
        title="Notifications"
        description="Workflow events addressed to you"
        meta={unread > 0
          ? <><span className="font-medium text-ink-2">{unread} unread</span> of {rows.length}</>
          : <>{rows.length} notification{rows.length === 1 ? '' : 's'} · all read</>}
      />
      <NotificationList rows={rows} />
    </Page>
  )
}
