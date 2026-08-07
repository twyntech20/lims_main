'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createAmendment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const order_id    = (formData.get('order_id')    as string ?? '').trim()
  const reason      = (formData.get('reason')      as string ?? '').trim()
  const description = (formData.get('description') as string ?? '').trim()

  if (!order_id || !reason || !description) {
    throw new Error('All fields are required')
  }

  const { error } = await supabase
    .from('amendments')
    .insert({
      order_id,
      reason,
      description,
      requested_by: user.id,
      status: 'pending',
    })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/amendments')
  redirect('/admin/amendments')
}

export async function approveAmendment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('amendments')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
  revalidatePath('/admin/amendments')
}

export async function rejectAmendment(id: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('amendments')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      description: reason,
    })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
  revalidatePath('/admin/amendments')
}
