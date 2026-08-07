'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name            = (formData.get('name')            as string ?? '').trim()
  const code            = (formData.get('code')            as string ?? '').trim() || null
  const category        = (formData.get('category')        as string ?? '').trim()
  const method          = (formData.get('method')          as string ?? '').trim() || null
  const unit            = (formData.get('unit')            as string ?? '').trim() || null
  const turnaroundDays  = parseInt(formData.get('turnaround_days') as string || '5', 10)
  const isActive        = formData.get('is_active') !== 'false'

  if (!name) throw new Error('Test name is required')
  if (!category) throw new Error('Category is required')

  const { error } = await supabase.from('tests').insert({
    name, code, category, method, unit,
    turnaround_days: isNaN(turnaroundDays) ? 5 : turnaroundDays,
    is_active: isActive,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/tests')
  redirect('/admin/tests')
}

export async function updateTest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id              = (formData.get('id')              as string ?? '').trim()
  const name            = (formData.get('name')            as string ?? '').trim()
  const code            = (formData.get('code')            as string ?? '').trim() || null
  const category        = (formData.get('category')        as string ?? '').trim()
  const method          = (formData.get('method')          as string ?? '').trim() || null
  const unit            = (formData.get('unit')            as string ?? '').trim() || null
  const turnaroundDays  = parseInt(formData.get('turnaround_days') as string || '5', 10)
  const isActive        = formData.get('is_active') === 'true'

  if (!name) throw new Error('Test name is required')

  const { error } = await supabase.from('tests').update({
    name, code, category, method, unit,
    turnaround_days: isNaN(turnaroundDays) ? 5 : turnaroundDays,
    is_active: isActive,
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/tests')
  redirect('/admin/tests')
}

export async function deleteTest(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('tests').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/tests')
}

export async function toggleTestActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('tests').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/tests')
}
