// ============================================================
// Result workflow — the single place that knows how the stored
// facts on a sample_test add up to a workflow state.
//
// There are deliberately NO new statuses here. result_status stays
// pending -> entered -> reviewed -> approved. The extra states an
// enterprise queue needs ("returned for changes", "released") are
// derived from facts that already live on the row (returned_at) or
// on the parent order (released_at).
// ============================================================

import type { ValidationError } from '@/lib/validation'

export type WorkflowState =
  | 'awaiting_entry'
  | 'returned'
  | 'awaiting_review'      // entered, no reviewer picked yet
  | 'in_review'            // handed to a named reviewer
  | 'approved'
  | 'released'

export interface WorkflowFacts {
  status: string
  returned_at?: string | null
  assigned_reviewer_id?: string | null
  order_released_at?: string | null
}

export function workflowState(f: WorkflowFacts): WorkflowState {
  if (f.status === 'approved') return f.order_released_at ? 'released' : 'approved'
  if (f.status === 'reviewed') return 'in_review'
  if (f.status === 'entered')  return f.returned_at ? 'returned' : 'awaiting_review'
  return 'awaiting_entry'
}

export const WORKFLOW_LABEL: Record<WorkflowState, string> = {
  awaiting_entry:  'Awaiting entry',
  returned:        'Returned for changes',
  awaiting_review: 'Awaiting review assignment',
  in_review:       'In review',
  approved:        'Approved',
  released:        'Released',
}

export const WORKFLOW_BADGE: Record<WorkflowState, string> = {
  awaiting_entry:  'bg-slate-100 text-slate-600 border border-slate-200',
  returned:        'bg-red-50 text-red-700 border border-red-200',
  awaiting_review: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  in_review:       'bg-blue-50 text-blue-700 border border-blue-200',
  approved:        'bg-green-50 text-green-700 border border-green-200',
  released:        'bg-emerald-600 text-white border border-emerald-600',
}

// What the queue tells the user to do next, and who has the ball.
export const WORKFLOW_NEXT_ACTION: Record<WorkflowState, string> = {
  awaiting_entry:  'Enter the result',
  returned:        'Correct the result and re-submit for review',
  awaiting_review: 'Assign a reviewer',
  in_review:       'Reviewer to approve or return',
  approved:        'Release the order to the client',
  released:        'Released — amendments only',
}

export const WORKFLOW_OWNER_ROLE: Record<WorkflowState, 'analyst' | 'reviewer' | 'releaser' | 'none'> = {
  awaiting_entry:  'analyst',
  returned:        'analyst',
  awaiting_review: 'analyst',
  in_review:       'reviewer',
  approved:        'releaser',
  released:        'none',
}

export function personName(
  p: { first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined,
): string {
  if (!p) return '—'
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || '—'
}

// "3d 4h" — how long a queue item has been sitting where it is.
export function waitingTime(since: string | null | undefined, now: number = Date.now()): string {
  if (!since) return '—'
  const ms = now - new Date(since).getTime()
  if (ms < 0) return '—'
  const hours = Math.floor(ms / 3_600_000)
  const days  = Math.floor(hours / 24)
  if (days > 0)  return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h`
  return `${Math.max(1, Math.floor(ms / 60_000))}m`
}

export function isOverdue(dateDue: string | null | undefined, now: number = Date.now()): boolean {
  return !!dateDue && new Date(dateDue).getTime() < now
}

// ── Validation ──────────────────────────────────────────────
// Only checks the schema can actually support. No scientific /
// range / QC rules are invented here — the catalog stores
// reference_range as free text with no parseable format, so there
// is nothing safe to validate a measurement against.

export const MIN_COMMENT_LENGTH = 10

export interface ResultEntryPayload {
  result: string | null
  unit: string | null
  qualifier: string | null
  mdl: string | null
  dilution_factor: number | null
}

/**
 * Everything a result needs before it can move forward.
 * `catalogUnit` is the unit defined on the test itself, used as the
 * fallback so we only complain when neither side supplies one.
 */
export function validateResultEntry(
  p: ResultEntryPayload,
  catalogUnit?: string | null,
): ValidationError {
  const errors: ValidationError = {}
  const hasValue = !!p.result?.trim()

  if (!hasValue && p.qualifier !== 'ND') {
    errors.result = 'Enter a result value, or select the ND qualifier for not detected'
  }
  if (hasValue && !p.unit?.trim() && !catalogUnit?.trim()) {
    errors.unit = 'A unit is required for a reported value (none is defined on the test either)'
  }
  if (p.dilution_factor !== null && !(p.dilution_factor > 0)) {
    errors.dilution_factor = 'Dilution factor must be greater than zero'
  }
  return errors
}

export function validateReviewComment(comment: string | null | undefined, label = 'Reason'): string | null {
  const value = comment?.trim() ?? ''
  if (!value) return `${label} is required`
  if (value.length < MIN_COMMENT_LENGTH) {
    return `${label} must be at least ${MIN_COMMENT_LENGTH} characters — say what needs to change`
  }
  return null
}

/**
 * Whether an order has gone out to the client.
 *
 * Mirrors the guard in submitToClient exactly: an order counts as released
 * once `released_at` is stamped OR its status reaches 'completed'. The two
 * are not equivalent in practice — `released_at` is written only by the
 * release action, while check_order_completion moves an order to 'completed'
 * on its own once every sample finishes. Orders that complete through the
 * trigger therefore carry a null `released_at`.
 *
 * The UI used to test `released_at` alone, so those orders kept offering an
 * actionable "Submit to Client" button that the server then refused with
 * "This order has already been released to the client". Reading release
 * state through this helper keeps every screen agreeing with the action.
 */
export function isOrderReleased(order: {
  released_at?: string | null
  status?: string | null
}): boolean {
  return Boolean(order.released_at) || order.status === 'completed'
}
