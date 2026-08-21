import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditUserForm from '@/components/users/EditUserForm'

interface Props { params: Promise<{ id: string }> }

export default async function AdminEditUserPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me) redirect('/login')
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', me.id).single()
  if (callerProfile?.role !== 'admin') redirect('/admin/users')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !profile) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users" className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Edit {[(profile as any).first_name, (profile as any).last_name].filter(Boolean).join(' ') || (profile as any).email}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{(profile as any).email}</p>
        </div>
      </div>
      <EditUserForm profile={profile as any} />
    </div>
  )
}
