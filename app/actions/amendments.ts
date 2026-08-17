'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateReviewComment } from '@/lib/workflow'

type Supabase = Awaited<ReturnType<typeof createClient>>

async function assertAmendmentReviewer(supabase: Supabase, userId: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  if (data?.role !== 'admin' && data?.role !== 'manager') {
    throw new Error('Only an admin or manager can decide on an amendment')
  }
}

/**
 * An amendment is how a controlled record gets changed. When it names a
 * specific result it may also carry the replacement values — those are
 * held here, unapplied, until someone with authority approves it.
 */
export async function createAmendment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const order_id       = (formData.get('order_id')       as string ?? '').trim()
  const reason         = (formData.get('reason')         as string ?? '').trim()
  const description    = (formData.get('description')    as string ?? '').trim()
  const sample_test_id = (formData.get('sample_test_id') as string ?? '').trim() || null

  if (!order_id) throw new Error('An order is required')
  if (!reason)   throw new Error('A reason is required')

  const descriptionError = validateReviewComment(description, 'A description of the change')
  if (descriptionError) throw new Error(descriptionError)

  // Replacement values, only meaningful when a specific result is targeted.
  let new_value: Record<string, string> | null = null
  if (sample_test_id) {
    const candidate: Record<string, string> = {}
    for (const field of ['result', 'unit', 'qualifier', 'mdl', 'dilution_factor']) {
      const value = (formData.get(`new_${field}`) as string ?? '').trim()
      if (value) candidate[field] = value
    }
    if (Object.keys(candidate).length === 0) {
      throw new Error('Enter at least one corrected value for the result being amended')
    }
    if (candidate.dilution_factor && !(parseFloat(candidate.dilution_factor) > 0)) {
      throw new Error('Dilution factor must be greater than zero')
    }

    const { data: target } = await supabase
      .from('sample_tests')
      .select('id, samples!inner(order_id)')
      .eq('id', sample_test_id)
      .single()
    if (!target) throw new Error('The result being amended could not be found')
    if ((target.samples as any)?.order_id !== order_id) {
      throw new Error('That result does not belong to the selected order')
    }
    new_value = candidate
  }

  const { error } = await supabase
    .from('amendments')
    .insert({
      order_id,
      sample_test_id,
      new_value,
      reason,
      description,
      requested_by: user.id,
      status: 'pending',
    })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/amendments')
  redirect('/admin/amendments')
}

/**
 * Approving an amendment that targets a result also applies it, through
 * the apply_amendment() database function — the one sanctioned path that
 * may write over a controlled value. It snapshots the previous value onto
 * the amendment, sends the result back through review, and un-releases the
 * order so an amended report has to be released again.
 */
export async function approveAmendment(id: string, comment?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await assertAmendmentReviewer(supabase, user.id)

  const { data: amendment } = await supabase
    .from('amendments').select('id, status, sample_test_id, order_id').eq('id', id).single()
  if (!amendment) throw new Error('Amendment not found')
  if (amendment.status !== 'pending') throw new Error('This amendment has already been decided')

  const { error } = await supabase
    .from('amendments')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_comment: comment?.trim() || null,
    })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)

  if (amendment.sample_test_id) {
    const { error: applyError } = await supabase.rpc('apply_amendment', { p_amendment_id: id })
    if (applyError) throw new Error(`Amendment approved but could not be applied: ${applyError.message}`)
  }

  revalidatePath('/admin/amendments')
  revalidatePath('/admin/work-queue')
  revalidatePath('/admin/review-queue')
  revalidatePath('/admin/dashboard')
  if (amendment.order_id) revalidatePath(`/admin/orders/${amendment.order_id}`)
}

export async function rejectAmendment(id: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await assertAmendmentReviewer(supabase, user.id)

  const reasonError = validateReviewComment(reason, 'A reason for rejecting this amendment')
  if (reasonError) throw new Error(reasonError)

  // The reviewer's reason goes to review_comment — the requester's original
  // description is part of the record and is not overwritten.
  const { error } = await supabase
    .from('amendments')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_comment: reason.trim(),
    })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
  revalidatePath('/admin/amendments')
}
