'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { enterResultsBatch, submitSampleForReview } from '@/app/actions/results'
import {
  CheckCircle2, Loader2, Undo2, AlertTriangle, Lock, Inbox, X, ChevronRight,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  workflowState, WORKFLOW_LABEL, WORKFLOW_NEXT_ACTION,
  personName, waitingTime, isOverdue, type WorkflowState,
} from '@/lib/workflow'
import { Badge, Mono, Table, Th, Td, Tr, TableWrap, EmptyState, buttonClass, FIELD, type Tone } from '@/components/ui/primitives'

type Person = { id?: string; first_name: string | null; last_name: string | null; email: string } | null

type SampleTest = {
  id: string
  status: string
  result: string | null
  unit: string | null
  qualifier: string | null
  mdl: string | null
  dilution_factor: number | null
  analyst_notes: string | null
  entered_at: string | null
  returned_at: string | null
  rejection_reason: string | null
  review_round: number | null
  assigned_reviewer_id: string | null
  samples: {
    id: string
    sample_id: string
    description: string | null
    matrix_type: string | null
    collection_date: string | null
    orders: {
      id: string
      order_number?: string | null
      priority: string
      date_due: string | null
      customer_name: string | null
      released_at: string | null
      clients: { client_name: string } | null
    } | null
  } | null
  tests: {
    id: string
    name: string
    code: string | null
    category: string
    unit: string | null
    method: string | null
    mdl: string | null
    matrix: string | null
    unit_options: string | null
  } | null
  entered_by_profile: Person
  assigned_reviewer_profile: Person
  returned_by_profile: Person
}

export type Reviewer = { id: string; first_name: string | null; last_name: string | null; email: string }

/** Workflow state → badge tone. Labels always accompany the colour. */
const STATE_TONE: Record<WorkflowState, Tone> = {
  awaiting_entry:  'neutral',
  returned:        'crit',
  awaiting_review: 'warn',
  in_review:       'review',
  approved:        'ok',
  released:        'solid',
}

const PRIORITY: Record<string, { label: string; tone: Tone }> = {
  normal:       { label: 'Normal', tone: 'neutral' },
  priority_48h: { label: '48 h',   tone: 'warn' },
  priority_24h: { label: '24 h',   tone: 'warn' },
  same_day:     { label: 'STAT',   tone: 'crit' },
}

function dueLabel(due: string | null | undefined) {
  if (!due) return { text: '—', overdue: false }
  const d = new Date(due)
  return {
    text: d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' }),
    overdue: d.getTime() < Date.now(),
  }
}

/* ============================================================
   One work item per row. The entry form is revealed on demand so
   the queue stays scannable, and every server action called here
   is the existing one — no workflow logic lives in this file.
   ============================================================ */

function QueueRow({
  st, reviewers, orderBasePath,
}: {
  st: SampleTest
  reviewers: Reviewer[]
  orderBasePath: string
}) {
  const order = st.samples?.orders ?? null
  const state = workflowState({
    status: st.status,
    returned_at: st.returned_at,
    assigned_reviewer_id: st.assigned_reviewer_id,
    order_released_at: order?.released_at,
  })

  const [open, setOpen] = useState(false)
  const [saving, startSave] = useTransition()
  const [assigning, startAssign] = useTransition()

  const [result, setResult]     = useState(st.result ?? '')
  const [unit, setUnit]         = useState(st.unit ?? st.tests?.unit ?? '')
  const [qualifier, setQual]    = useState(st.qualifier ?? '')
  // MDL falls back to the analysis catalog (Master List of Analyses).
  const [mdl, setMdl]           = useState(st.mdl ?? st.tests?.mdl ?? '')
  const [dilution, setDilution] = useState(st.dilution_factor?.toString() ?? '')
  const [notes, setNotes]       = useState(st.analyst_notes ?? '')
  const [reviewerId, setReviewerId] = useState('')

  const editable = state === 'awaiting_entry' || state === 'returned' || state === 'awaiting_review'
  const canAssign = state === 'awaiting_review' || state === 'returned'
  const due = dueLabel(order?.date_due)
  const priority = PRIORITY[order?.priority ?? 'normal'] ?? PRIORITY.normal

  function handleSave() {
    startSave(async () => {
      try {
        await enterResultsBatch(st.id, {
          result:          qualifier === 'ND' ? null : result || null,
          unit:            unit || null,
          qualifier:       qualifier || null,
          mdl:             mdl || null,
          dilution_factor: dilution ? parseFloat(dilution) : null,
          analyst_notes:   notes || null,
        })
        toast.success('Result saved')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to save')
      }
    })
  }

  function handleAssign() {
    if (!reviewerId) { toast.error('Select a reviewer first'); return }
    startAssign(async () => {
      try {
        await submitSampleForReview(st.id, reviewerId)
        toast.success('Assigned for review')
        setOpen(false)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to assign review')
      }
    })
  }

  const displayResult = st.qualifier === 'ND'
    ? 'ND'
    : [st.qualifier, st.result].filter(Boolean).join(' ') || '—'

  return (
    <>
      <Tr flag={state === 'returned' ? 'crit' : undefined}>
        {/* Order */}
        <Td className="whitespace-nowrap">
          {order?.id ? (
            <Link href={`${orderBasePath}/${order.id}`} className="font-medium text-brand-600 hover:text-brand-700">
              <Mono>{order.order_number ?? 'Order'}</Mono>
            </Link>
          ) : <span className="text-ink-4">—</span>}
          <div className="mt-0.5 max-w-[150px] truncate text-[11px] text-ink-4">
            {order?.clients?.client_name ?? order?.customer_name ?? ''}
          </div>
        </Td>

        {/* Sample */}
        <Td className="whitespace-nowrap">
          <Mono className="text-ink">{st.samples?.sample_id ?? '—'}</Mono>
          {st.samples?.matrix_type && (
            <div className="mt-0.5 text-[11px] text-ink-4">{st.samples.matrix_type.replace(/_/g, ' ')}</div>
          )}
        </Td>

        {/* Test */}
        <Td>
          <div className="max-w-[240px] truncate font-medium text-ink">{st.tests?.name ?? '—'}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-4">
            {st.tests?.code && <Mono className="text-[11px]">{st.tests.code}</Mono>}
            {st.tests?.method && <span className="truncate">· {st.tests.method}</span>}
          </div>
        </Td>

        {/* Result so far — context for the reviewer/analyst */}
        <Td className="whitespace-nowrap tabular">
          {state === 'awaiting_entry'
            ? <span className="text-ink-4">—</span>
            : <span className="font-medium text-ink">{displayResult} <span className="font-normal text-ink-4">{st.unit ?? ''}</span></span>}
        </Td>

        {/* Analyst */}
        <Td className="whitespace-nowrap text-[12px]">{personName(st.entered_by_profile)}</Td>

        {/* Reviewer */}
        <Td className="whitespace-nowrap text-[12px]">
          {st.assigned_reviewer_profile
            ? personName(st.assigned_reviewer_profile)
            : <span className="text-ink-4">Unassigned</span>}
          {(st.review_round ?? 1) > 1 && (
            <div className="mt-0.5 text-[11px] text-ink-4">round {st.review_round}</div>
          )}
        </Td>

        {/* Priority */}
        <Td className="whitespace-nowrap">
          {order?.priority === 'normal'
            ? <span className="text-[12px] text-ink-4">Normal</span>
            : <Badge tone={priority.tone} dot>{priority.label}</Badge>}
        </Td>

        {/* Due */}
        <Td className="whitespace-nowrap tabular">
          <span className={cn('text-[12px]', due.overdue && state !== 'released' ? 'font-medium text-crit-fg' : 'text-ink-2')}>
            {due.text}
          </span>
          {due.overdue && state !== 'released' && state !== 'approved' && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-crit-fg">
              <AlertTriangle className="h-3 w-3" /> overdue
            </div>
          )}
        </Td>

        {/* Status */}
        <Td className="whitespace-nowrap">
          <Badge tone={STATE_TONE[state]} dot={state !== 'awaiting_entry'}>{WORKFLOW_LABEL[state]}</Badge>
          {state !== 'awaiting_entry' && state !== 'released' && (
            <div className="mt-0.5 text-[11px] text-ink-4">
              {waitingTime(state === 'returned' ? st.returned_at : st.entered_at)} waiting
            </div>
          )}
        </Td>

        {/* Next action */}
        <Td className="whitespace-nowrap">
          {editable || canAssign ? (
            <button
              onClick={() => setOpen(v => !v)}
              className={buttonClass(state === 'returned' ? 'danger' : 'primary', 'sm')}
              aria-expanded={open}
            >
              {open ? <X className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {state === 'returned' ? 'Resolve return' : state === 'awaiting_entry' ? 'Enter result' : 'Assign reviewer'}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
              {state === 'in_review' && <><Loader2 className="h-3 w-3" /> {WORKFLOW_NEXT_ACTION[state]}</>}
              {state === 'approved'  && <><CheckCircle2 className="h-3 w-3 text-ok-fg" /> Release report</>}
              {state === 'released'  && <><Lock className="h-3 w-3" /> Released</>}
            </span>
          )}
        </Td>
      </Tr>

      {/* Reviewer's reason, always visible on returned work. */}
      {state === 'returned' && st.rejection_reason && (
        <tr className="bg-crit-bg/45">
          <td colSpan={10} className="border-b border-line px-3 pb-2 pt-0">
            <div className="flex items-start gap-2 rounded-md border border-crit-line bg-surface px-2.5 py-1.5 text-[12px]">
              <Undo2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-crit-fg" />
              <p className="text-ink-2">
                <span className="font-medium text-crit-fg">
                  Returned by {personName(st.returned_by_profile)}
                  {st.returned_at ? ` · ${waitingTime(st.returned_at)} ago` : ''}:
                </span>{' '}
                {st.rejection_reason}
              </p>
            </div>
          </td>
        </tr>
      )}

      {/* Inline editor — same fields and same server actions as before. */}
      {open && (editable || canAssign) && (
        <tr className="bg-surface-muted">
          <td colSpan={10} className="border-b border-line px-3 py-3">
            <div className="flex flex-wrap items-end gap-3">
              {editable && (
                <>
                  <Labelled label="Result">
                    <input
                      value={qualifier === 'ND' ? '' : result}
                      onChange={e => setResult(e.target.value)}
                      disabled={qualifier === 'ND'}
                      placeholder="0.00"
                      className={cn(FIELD, 'w-28 disabled:bg-surface-sunken disabled:text-ink-4')}
                    />
                  </Labelled>
                  <Labelled label="Unit" hint={st.tests?.unit_options ?? undefined}>
                    <input value={unit} onChange={e => setUnit(e.target.value)}
                      placeholder={st.tests?.unit ?? 'unit'} className={cn(FIELD, 'w-24')} />
                  </Labelled>
                  <Labelled label="Qualifier">
                    <select value={qualifier} onChange={e => setQual(e.target.value)} className={cn(FIELD, 'w-24 pr-7')}>
                      <option value="">—</option>
                      <option value="ND">ND</option>
                      <option value="&lt;">{'<'}</option>
                      <option value="&gt;">{'>'}</option>
                      <option value="B">B</option>
                      <option value="E">E</option>
                    </select>
                  </Labelled>
                  <Labelled label="MDL">
                    <input value={mdl} onChange={e => setMdl(e.target.value)}
                      placeholder={st.tests?.mdl ?? 'MDL'} className={cn(FIELD, 'w-20')} />
                  </Labelled>
                  <Labelled label="Dilution">
                    <input value={dilution} onChange={e => setDilution(e.target.value)} type="number" min="0" step="0.1"
                      placeholder="1" className={cn(FIELD, 'w-20')} />
                  </Labelled>
                  <Labelled label="Analyst notes" grow>
                    <input value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Observations for the reviewer…" className={cn(FIELD, 'w-full min-w-[200px]')} />
                  </Labelled>
                  <button onClick={handleSave} disabled={saving} className={buttonClass('secondary', 'md')}>
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {saving ? 'Saving…' : 'Save result'}
                  </button>
                </>
              )}

              {canAssign && (
                <div className="flex items-end gap-2 border-l border-line pl-3">
                  <Labelled label="Send to reviewer">
                    <select value={reviewerId} onChange={e => setReviewerId(e.target.value)} className={cn(FIELD, 'w-48 pr-7')}>
                      <option value="">Select reviewer…</option>
                      {reviewers.map(r => (
                        <option key={r.id} value={r.id}>
                          {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email}
                        </option>
                      ))}
                    </select>
                  </Labelled>
                  <button onClick={handleAssign} disabled={assigning || !reviewerId} className={buttonClass('primary', 'md')}>
                    {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {state === 'returned' ? 'Re-submit for review' : 'Assign review'}
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function Labelled({
  label, hint, children, grow,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  grow?: boolean
}) {
  return (
    <label className={cn('flex flex-col gap-1', grow && 'min-w-[200px] flex-1')} title={hint}>
      <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">{label}</span>
      {children}
    </label>
  )
}

export default function WorkQueueTable({
  rows, orderBasePath = '/admin/orders', reviewers = [],
}: {
  rows: SampleTest[]
  orderBasePath?: string
  reviewers?: Reviewer[]
}) {
  if (rows.length === 0) {
    return (
      <TableWrap>
        <EmptyState
          icon={Inbox}
          title="Nothing in this queue"
          description="No results match the current tab and filters."
        />
      </TableWrap>
    )
  }

  return (
    <>
      <Toaster position="top-center" />
      <TableWrap maxHeight="calc(100vh - 260px)">
        <Table>
          <thead>
            <tr>
              <Th width="140px">Order</Th>
              <Th width="120px">Sample</Th>
              <Th>Test</Th>
              <Th width="110px">Result</Th>
              <Th width="120px">Analyst</Th>
              <Th width="130px">Reviewer</Th>
              <Th width="90px">Priority</Th>
              <Th width="90px">Due</Th>
              <Th width="150px">Status</Th>
              <Th width="160px">Next action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(st => (
              <QueueRow key={st.id} st={st} reviewers={reviewers} orderBasePath={orderBasePath} />
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </>
  )
}
