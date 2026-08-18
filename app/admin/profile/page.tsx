import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'
import { Page, PageHeader } from '@/components/ui/primitives'
import { UserCircle } from 'lucide-react'

export default async function AdminProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, phone_number')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <Page narrow>
      <PageHeader
        icon={UserCircle}
        title="My Profile"
        description="Your account details and contact information"
        meta={<span className="capitalize">{profile.role}</span>}
      />
      <ProfileForm profile={profile as any} />
    </Page>
  )
}
