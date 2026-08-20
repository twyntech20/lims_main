'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertNoErrors } from '@/lib/validation'
import {
  validateResultEntry,
  validateReviewComment,
  type ResultEntryPayload,
  isQualifiedForCategory,
  labCategoryLabel,
} from '@/lib/workflow'

type Supabase = Awaited<ReturnType<typeof createClient>>

const QUEUE_PATHS = [
  '/admin/work-queue',
  '/admin/review-queue',
  '/analyst/work-queue',
  '/analyst/review-queue',
  '/admin/dashboard',
  '/analyst/dashboard',
]

function revalidateQueues() {
  for (const path of QUEUE_PATHS) revalidatePath(path)
}

// The full workflow context for one result: the row itself, the test's
// catalog unit, and whether the parent order has already been released.
async function loadResultContext(supabase: Supabase, sampleTestId: string) {
  const { data, error } = await supabase
    .from('sample_tests')
    .select(`
      id, status, result, unit, qualifier, mdl, dilution_factor, analyst_notes,
      entered_by, assigned_reviewer_id, returned_at, review_round,
      tests ( unit, category ),
      samples!inner ( id, order_id, orders!inner ( id, status, released_at, assigned_analyst_id ) )
    `)
    .eq('id', sampleTestId)
    .single()

  if (error || !data) throw new Error('Result not found')

  const sample = data.samples as any
  const order  = sample?.orders
  return {
    row:         data as any,
    catalogUnit: (data.tests as any)?.unit as string | null,
    catalogCategory: (data.tests as any)?.category as string | null,
    sampleId:    sample?.id as string,
    order:       order as { id: string; status: string; released_at: string | null; assigned_analyst_id: string | null },
  }
}

async function loadProfile(supabase: Supabase, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('role, can_review, specialty_chemistry, specialty_microbiology')
    .eq('id', userId)
    .single()
  return data as {
    role: string
    can_review: boolean
    specialty_chemistry: boolean | null
    specialty_microbiology: boolean | null
  } | null
}

/**
 * A result belongs to a laboratory department (tests.category). Only someone
 * qualified in that department may take it on. Enforced here, in the action
 * layer, so it holds for a direct server-action call and not just for a UI
 * that hides the option.
 */
function assertQualifiedForCategory(
  profile: Parameters<typeof isQualifiedForCategory>[0],
  category: string | null,
  subject: 'You are' | 'The selected reviewer is',
) {
  if (isQualifiedForCategory(profile, category)) return
  throw new Error(
    `${subject} not qualified for ${labCategoryLabel(category)} work — ` +
    'this result belongs to a department outside the assigned specialty',
  )
}

function isStaffAdmin(profile: { role: string } | null) {
  return profile?.role === 'admin' || profile?.role === 'manager'
}

async function assertCanReview(supabase: Supabase, userId: string) {
  const profile = await loadProfile(supabase, userId)
  if (!(isStaffAdmin(profile) || profile?.can_review === true)) {
    throw new Error('You are not authorized to review or approve results')
  }
  return profile
}

function auditEntry(userId: string, action: string, sampleTestId: string, values: Record<string, unknown>) {
  return {
    user_id: userId,
    action,
    table_name: 'sample_tests',
    record_id: sampleTestId,
    new_values: values,
  }
}

// ── Result entry ────────────────────────────────────────────

/**
 * Result integrity gate. An approved or released value is a controlled
 * record and only the amendments workflow may change it; a result sitting
 * with a reviewer is frozen until that reviewer hands it back.
 */
async function assertResultEditable(
  supabase: Supabase,
  ctx: Awaited<ReturnType<typeof loadResultContext>>,
  userId: string,
) {
  const { row, order } = ctx

  if (order?.released_at) {
    throw new Error('This order has been released to the client — changes require an approved amendment')
  }
  if (row.status === 'approved') {
    throw new Error('This result is approved and cannot be edited directly — raise an amendment')
  }
  if (row.status === 'reviewed') {
    throw new Error('This result is with its reviewer — it can only be changed after the reviewer returns it')
  }

  const profile = await loadProfile(supabase, userId)
  const isOwner = row.entered_by === userId || order?.assigned_analyst_id === userId
  if (row.entered_by && !isOwner && !isStaffAdmin(profile)) {
    throw new Error('Only the analyst who entered this result (or an admin) can change it')
  }
  assertQualifiedForCategory(profile, ctx.catalogCategory, 'You are')
}

async function writeResult(sampleTestId: string, payload: ResultEntryPayload, analystNotes: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ctx = await loadResultContext(supabase, sampleTestId)
  await assertResultEditable(supabase, ctx, user.id)
  assertNoErrors(validateResultEntry(payload, ctx.catalogUnit))

  const { error } = await supabase
    .from('sample_tests')
    .update({
      ...payload,
      analyst_notes: analystNotes,
      status:        'entered',
      entered_by:    user.id,
      entered_at:    new Date().toISOString(),
    })
    .eq('id', sampleTestId)

  if (error) throw new Error(error.message)
  revalidateQueues()
}

export async function enterResult(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sampleTestId   = (formData.get('sample_test_id') as string ?? '').trim()
  const dilutionFactor = (formData.get('dilution_factor') as string ?? '').trim()
  if (!sampleTestId) throw new Error('Sample test ID is required')

  await writeResult(
    sampleTestId,
    {
      result:          (formData.get('result')    as string ?? '').trim() || null,
      unit:            (formData.get('unit')      as string ?? '').trim() || null,
      qualifier:       (formData.get('qualifier') as string ?? '').trim() || null,
      mdl:             (formData.get('mdl')       as string ?? '').trim() || null,
      dilution_factor: dilutionFactor ? parseFloat(dilutionFactor) : null,
    },
    (formData.get('analyst_notes') as string ?? '').trim() || null,
  )
}

export async function enterResultsBatch(
  sampleTestId: string,
  payload: ResultEntryPayload & { analyst_notes: string | null },
) {
  const { analyst_notes, ...values } = payload
  await writeResult(sampleTestId, values, analyst_notes)
}

// ── Review routing ──────────────────────────────────────────

/**
 * Task 2's explicit reviewer assignment, unchanged in shape: Analyst 1
 * names the reviewer the result goes to. Task 3 adds the gates around
 * it — the result must actually be complete, and the reviewer must not
 * be the person who produced it.
 */
export async function submitSampleForReview(sampleTestId: string, reviewerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!reviewerId) throw new Error('Select a reviewer to assign this result to')

  const { data: reviewer } = await supabase
    .from('profiles')
    .select('role, can_review, is_active, specialty_chemistry, specialty_microbiology')
    .eq('id', reviewerId)
    .single()
  const reviewerOk = reviewer?.role === 'admin' || reviewer?.role === 'manager' || reviewer?.can_review === true
  if (!reviewerOk) throw new Error('Selected reviewer is not authorized to review results')
  if (reviewer?.is_active === false) throw new Error('Selected reviewer is no longer active')
  if (reviewerId === user.id) throw new Error('You cannot assign a review to yourself')

  const ctx = await loadResultContext(supabase, sampleTestId)
  // A reviewer must be qualified in the result's department, or chemistry
  // work could be signed off by a microbiology-only reviewer.
  assertQualifiedForCategory(reviewer, ctx.catalogCategory, 'The selected reviewer is')
  if (ctx.order?.released_at) throw new Error('This order has already been released')
  if (ctx.row.status !== 'entered') {
    throw new Error('Only a result that has been entered can be sent for review')
  }
  // Segregation of duties holds however the assignment is made — an admin
  // assigning on someone's behalf still cannot route it to its own author.
  if (ctx.row.entered_by && ctx.row.entered_by === reviewerId) {
    throw new Error('A result cannot be reviewed by the analyst who entered it')
  }
  assertNoErrors(validateResultEntry(ctx.row, ctx.catalogUnit))

  // Coming back from a return starts a fresh review round, so the history
  // shows this is the second (third…) time it has been reviewed.
  const nextRound = ctx.row.returned_at ? (ctx.row.review_round ?? 1) + 1 : (ctx.row.review_round ?? 1)

  // "reviewed_by"/"reviewed_at" still get set at approval time (see
  // approveSampleTest) so they always reflect who actually reviewed it —
  // assigned_reviewer_id is who it was handed to, a separate fact.
  const { error } = await supabase
    .from('sample_tests')
    .update({ status: 'reviewed', assigned_reviewer_id: reviewerId, review_round: nextRound })
    .eq('id', sampleTestId)
    .eq('status', 'entered')   // must be entered before reviewing

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert(
    auditEntry(user.id, 'result_submitted_for_review', sampleTestId, {
      assigned_reviewer_id: reviewerId, review_round: nextRound,
    }),
  )
  revalidateQueues()
}

/** The assigned reviewer owns the decision; admins/managers can act as backstop. */
async function assertIsDecisionMaker(
  supabase: Supabase,
  ctx: Awaited<ReturnType<typeof loadResultContext>>,
  userId: string,
) {
  const profile = await assertCanReview(supabase, userId)
  const assigned = ctx.row.assigned_reviewer_id
  if (assigned && assigned !== userId && !isStaffAdmin(profile)) {
    throw new Error('This result is assigned to another reviewer')
  }
}

export async function approveSampleTest(sampleTestId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ctx = await loadResultContext(supabase, sampleTestId)
  await assertIsDecisionMaker(supabase, ctx, user.id)

  // Segregation of duties: whoever entered the result cannot also approve it.
  if (ctx.row.entered_by && ctx.row.entered_by === user.id) {
    throw new Error('You cannot approve a result you entered yourself — ask another reviewer')
  }
  if (ctx.row.status !== 'reviewed') {
    throw new Error('Only a result that has been submitted for review can be approved')
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

  await supabase.from('audit_logs').insert(
    auditEntry(user.id, 'result_approved', sampleTestId, { review_round: ctx.row.review_round }),
  )
  await advanceSampleIfComplete(supabase, ctx.sampleId)
  revalidateQueues()
}

/**
 * Analyst 2 hands the work back to Analyst 1 with a reason.
 *
 * The reason goes to its own column: analyst_notes belongs to the analyst
 * and previously got overwritten here, destroying both their notes and any
 * earlier rejection reason. Status returns to 'entered' (no new status),
 * and returned_at is what makes the queue show it as "returned for
 * changes" rather than a result nobody has looked at yet.
 */
export async function rejectToAnalyst(sampleTestId: string, note: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const reasonError = validateReviewComment(note, 'A reason for returning this result')
  if (reasonError) throw new Error(reasonError)

  const ctx = await loadResultContext(supabase, sampleTestId)
  await assertIsDecisionMaker(supabase, ctx, user.id)
  if (ctx.row.status !== 'reviewed') {
    throw new Error('Only a result currently under review can be returned')
  }

  const { error } = await supabase
    .from('sample_tests')
    .update({
      status:               'entered',   // send back to entered so analyst can fix
      reviewed_by:          null,
      reviewed_at:          null,
      assigned_reviewer_id: null,        // it is the analyst's again until re-submitted
      returned_at:          new Date().toISOString(),
      returned_by:          user.id,
      rejection_reason:     note.trim(),
    })
    .eq('id', sampleTestId)
    .eq('status', 'reviewed')

  if (error) throw new Error(error.message)

  await supabase.from('audit_logs').insert(
    auditEntry(user.id, 'result_returned_for_changes', sampleTestId, {
      reason: note.trim(), review_round: ctx.row.review_round,
    }),
  )
  revalidateQueues()
}

// ── Automation ──────────────────────────────────────────────

/**
 * When the last result on a sample is approved, the sample is finished.
 * That closes a chain that already existed but never fired: the
 * check_order_completion trigger promotes an order from in_progress to
 * review once every one of its samples is completed.
 */
async function advanceSampleIfComplete(supabase: Supabase, sampleId: string) {
  if (!sampleId) return

  const { data: siblings } = await supabase
    .from('sample_tests').select('status').eq('sample_id', sampleId)

  const allApproved = !!siblings?.length && siblings.every(s => s.status === 'approved')
  if (!allApproved) return

  await supabase
    .from('samples')
    .update({ status: 'completed' })
    .eq('id', sampleId)
    .neq('status', 'completed')
}
