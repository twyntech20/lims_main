'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const first_name = (formData.get('first_name') as string ?? '').trim()
  const last_name = (formData.get('last_name') as string ?? '').trim()
  const phone_number = (formData.get('phone_number') as string ?? '').trim() || null
  const { error } = await supabase.from('profiles').update({ first_name, last_name, phone_number }).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/profile')
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const password = (formData.get('password') as string ?? '').trim()
  const confirm = (formData.get('confirm_password') as string ?? '').trim()
  if (password.length < 8) throw new Error('Password must be at least 8 characters')
  if (password !== confirm) throw new Error('Passwords do not match')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
  // Clear force_password_change if set
  await supabase.from('profiles').update({ force_password_change: false }).eq('id', user.id)
}

export async function forceChangePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const password = (formData.get('password') as string ?? '').trim()
  const confirm = (formData.get('confirm_password') as string ?? '').trim()
  if (password.length < 8) throw new Error('Password must be at least 8 characters')
  if (password !== confirm) throw new Error('Passwords do not match')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
  await supabase.from('profiles').update({ force_password_change: false }).eq('id', user.id)
  redirect('/admin/dashboard')
}
