import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/client-login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, company_name')
    .eq('id', user.id)
    .single()

  if (!profile || (profile as any).role !== 'client') redirect('/client-login')

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas lg:flex-row">
      <Sidebar
        role="client"
        userName={[(profile as any).first_name, (profile as any).company_name].filter(Boolean)[0] || user.email || ''}
        unreadCount={count ?? 0}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
