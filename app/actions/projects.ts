'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const project_name = (formData.get('project_name') as string ?? '').trim()
  const project_no   = (formData.get('project_no')   as string ?? '').trim() || null
  const project_code = (formData.get('project_code') as string ?? '').trim() || null
  const project_man  = (formData.get('project_man')  as string ?? '').trim() || null
  const date_receive = (formData.get('date_receive') as string ?? '').trim() || null
  const date_complete= (formData.get('date_complete')as string ?? '').trim() || null

  if (!project_name) throw new Error('Project name is required')

  const { error } = await supabase.from('projects').insert({
    project_name,
    project_no,
    project_code,
    project_man,
    date_receive: date_receive || null,
    date_complete: date_complete || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/projects')
  redirect('/admin/projects')
}

export async function updateProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id           = (formData.get('id')           as string ?? '').trim()
  const project_name = (formData.get('project_name') as string ?? '').trim()
  const project_no   = (formData.get('project_no')   as string ?? '').trim() || null
  const project_code = (formData.get('project_code') as string ?? '').trim() || null
  const project_man  = (formData.get('project_man')  as string ?? '').trim() || null
  const date_receive = (formData.get('date_receive') as string ?? '').trim() || null
  const date_complete= (formData.get('date_complete')as string ?? '').trim() || null

  if (!project_name) throw new Error('Project name is required')

  const { error } = await supabase.from('projects').update({
    project_name,
    project_no,
    project_code,
    project_man,
    date_receive: date_receive || null,
    date_complete: date_complete || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/projects')
  redirect('/admin/projects')
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/projects')
}
