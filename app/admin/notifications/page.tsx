import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationList from '@/components/notifications/NotificationList'

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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <NotificationList rows={(notifications ?? []) as any} />
    </div>
  )
}
