'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function enterResult(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sampleTestId   = (formData.get('sample_test_id') as string ?? '').trim()
  const result         = (formData.get('result')          as string ?? '').trim() || null
  const unit           = (formData.get('unit')            as string ?? '').trim() || null
  const qualifier      = (formData.get('qualifier')       as string ?? '').trim() || null
  const mdl            = (formData.get('mdl')             as string ?? '').trim() || null
  const dilutionFactor = (formData.get('dilution_factor') as string ?? '').trim() || null
  const analystNotes   = (formData.get('analyst_notes')   as string ?? '').trim() || null

  if (!sampleTestId) throw new Error('Sample test ID is required')
  if (!result && qualifier !== 'ND') throw new Error('Result is required (or select ND for not detected)')

  const { error } = await supabase
    .from('sample_tests')
    .update({
      result,
      unit,
      qualifier: qualifier || null,
      mdl,
      dilution_factor: dilutionFactor ? parseFloat(dilutionFactor) : null,
      analyst_notes:   analystNotes,
      status:          'entered',
      entered_by:      user.id,
      entered_at:      new Date().toISOString(),
    })
    .eq('id', sampleTestId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/work-queue')
  revalidatePath('/admin/review-queue')
}

export async function enterResultsBatch(
  sampleTestId: string,
  payload: {
    result: string | null
    unit: string | null
    qualifier: string | null
    mdl: string | null
    dilution_factor: number | null
    analyst_notes: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('sample_tests')
    .update({
      ...payload,
      status:     'entered',
      entered_by: user.id,
      entered_at: new Date().toISOString(),
    })
    .eq('id', sampleTestId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/work-queue')
  revalidatePath('/admin/review-queue')
}

async function assertCanReview(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('role, can_review').eq('id', userId).single()
  const canReview = profile?.role === 'admin' || profile?.role === 'manager' || profile?.can_review === true
  if (!canReview) throw new Error('You are not authorized to review or approve results')
}

export async function submitSampleForReview(sampleTestId: string, reviewerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!reviewerId) throw new Error('Select a reviewer to assign this result to')

  const { data: reviewer } = await supabase.from('profiles').select('role, can_review').eq('id', reviewerId).single()
  const reviewerOk = reviewer?.role === 'admin' || reviewer?.role === 'manager' || reviewer?.can_review === true
  if (!reviewerOk) throw new Error('Selected reviewer is not authorized to review results')
  if (reviewerId === user.id) throw new Error('You cannot assign a review to yourself')

  // "reviewed_by"/"reviewed_at" still get set at approval time (see
  // approveSampleTest) so they always reflect who actually reviewed it —
  // assigned_reviewer_id is who it was handed to, a separate fact.
  const { error } = await supabase
    .from('sample_tests')
    .update({ status: 'reviewed', assigned_reviewer_id: reviewerId })
    .eq('id', sampleTestId)
    .eq('status', 'entered')   // must be entered before reviewing

  if (error) throw new Error(error.message)
  revalidatePath('/admin/work-queue')
  revalidatePath('/admin/review-queue')
  revalidatePath('/analyst/work-queue')
  revalidatePath('/analyst/review-queue')
}

export async function approveSampleTest(sampleTestId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await assertCanReview(supabase, user.id)

  // Segregation of duties: whoever entered the result cannot also approve it.
  const { data: st } = await supabase.from('sample_tests').select('entered_by').eq('id', sampleTestId).single()
  if (st?.entered_by && st.entered_by === user.id) {
    throw new Error('You cannot approve a result you entered yourself — ask another reviewer')
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('sample_tests')
    .update({
      status:       'approved',
      reviewed_by:  user.id,
      reviewed_at:  now,
      approved_by:  user.id,
      approved_at:  now,
    })
    .eq('id', sampleTestId)
    .eq('status', 'reviewed')

  if (error) throw new Error(error.message)
  revalidatePath('/admin/review-queue')
  revalidatePath('/admin/work-queue')
}

export async function rejectToAnalyst(sampleTestId: string, note: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await assertCanReview(supabase, user.id)

  const { error } = await supabase
    .from('sample_tests')
    .update({
      status:         'entered',   // send back to entered so analyst can fix
      reviewed_by:    null,
      reviewed_at:    null,
      analyst_notes:  note,
    })
    .eq('id', sampleTestId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/review-queue')
  revalidatePath('/admin/work-queue')
}
