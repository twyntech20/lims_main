'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { approveSampleTest, rejectToAnalyst } from '@/app/actions/results'
import {
  CheckCircle2, XCircle, Loader2, AlertTriangle, Undo2, ClipboardCheck,
  History, ChevronDown,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  workflowState, WORKFLOW_LABEL, personName, waitingTime, isOverdue,
  MIN_COMMENT_LENGTH, type WorkflowState,
} from '@/lib/workflow'
import { Badge, Mono, Table, Th, Td, Tr, TableWrap, EmptyState, buttonClass, FIELD, type Tone } from '@/components/ui/primitives'

type Person = { first_name: string | null; last_name: string | null; email: string } | null

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
  reviewed_at: string | null
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
    method?: string | null
    mdl?: string | null
  } | null
  entered_by_profile: Person
  reviewed_by_profile: Person
  assigned_reviewer_profile: Person
  returned_by_profile: Person
}

const STATE_TONE: Record<WorkflowState, Tone> = {
  awaiting_entry: 'neutral', returned: 'crit', awaiting_review: 'warn',
  in_review: 'review', approved: 'ok', released: 'solid',
}

const PRIORITY: Record<string, { label: string; tone: Tone }> = {
  normal:       { label: 'Normal', tone: 'neutral' },
  priority_48h: { label: '48 h',   tone: 'warn' },
  priority_24h: { label: '24 h',   tone: 'warn' },
  same_day:     { label: 'STAT',   tone: 'crit' },
}

function ReviewRow({ st, orderBasePath }: { st: SampleTest; orderBasePath: string }) {
  const [approving, startApprove] = useTransition()
  const [rejecting, startReject]  = useTransition()
  const [note, setNote] = useState('')
  const [panel, setPanel] = useState<null | 'return' | 'detail'>(null)

  const order = st.samples?.orders ?? null
  const state = workflowState({
    status: st.status,
    returned_at: st.returned_at,
    assigned_reviewer_id: st.assigned_reviewer_id,
    order_released_at: order?.released_at,
  })
  const overdue = isOverdue(order?.date_due) && state === 'in_review'
  const priority = PRIORITY[order?.priority ?? 'normal'] ?? PRIORITY.normal
  const noteTooShort = note.trim().length < MIN_COMMENT_LENGTH

  function handleApprove() {
    startApprove(async () => {
      try { await approveSampleTest(st.id); toast.success('Result approved') }
      catch (err: any) { toast.error(err.message ?? 'Failed') }
    })
  }

  function handleReject() {
    startReject(async () => {
      try {
        await rejectToAnalyst(st.id, note)
        toast.success('Returned to the analyst')
        setPanel(null); setNote('')
      } catch (err: any) { toast.error(err.message ?? 'Failed') }
    })
  }

  const displayResult = st.qualifier === 'ND'
    ? 'ND'
    : [st.qualifier, st.result].filter(Boolean).join(' ') || '—'

  return (
    <>
      <Tr flag={overdue ? 'warn' : undefined}>
        <Td className="whitespace-nowrap">
          {order?.id ? (
            <Link href={`${orderBasePath}/${order.id}`} className="font-medium text-brand-600 hover:text-brand-700">
              <Mono>{order.order_number ?? 'Order'}</Mono>
            </Link>
          ) : '—'}
          <div className="mt-0.5 max-w-[150px] truncate text-[11px] text-ink-4">
            {order?.clients?.client_name ?? order?.customer_name ?? ''}
          </div>
        </Td>

        <Td className="whitespace-nowrap"><Mono className="text-ink">{st.samples?.sample_id ?? '—'}</Mono></Td>

        <Td>
          <div className="max-w-[220px] truncate font-medium text-ink">{st.tests?.name ?? '—'}</div>
          <div className="mt-0.5 text-[11px] text-ink-4">
            {st.tests?.code && <Mono className="text-[11px]">{st.tests.code}</Mono>}
            {st.tests?.method && <span> · {st.tests.method}</span>}
          </div>
        </Td>

        {/* The value under review — the reason this screen exists. */}
        <Td className="whitespace-nowrap tabular">
          <span className="font-medium text-ink">{displayResult}</span>{' '}
          <span className="text-ink-4">{st.unit ?? ''}</span>
          <div className="mt-0.5 text-[11px] text-ink-4">
            MDL {st.mdl ?? st.tests?.mdl ?? '—'} · DF {st.dilution_factor ?? 1}
          </div>
        </Td>

        <Td className="whitespace-nowrap text-[12px]">{personName(st.entered_by_profile)}</Td>

        <Td className="whitespace-nowrap text-[12px]">
          {personName(st.assigned_reviewer_profile)}
          {(st.review_round ?? 1) > 1 && <div className="mt-0.5 text-[11px] text-ink-4">round {st.review_round}</div>}
        </Td>

        <Td className="whitespace-nowrap">
          {order?.priority === 'normal'
            ? <span className="text-[12px] text-ink-4">Normal</span>
            : <Badge tone={priority.tone} dot>{priority.label}</Badge>}
        </Td>

        <Td className="whitespace-nowrap tabular text-[12px] text-ink-2">
          {st.entered_at ? new Date(st.entered_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' }) : '—'}
        </Td>

        <Td className="whitespace-nowrap tabular">
          <span className={cn('text-[12px]', overdue ? 'font-medium text-crit-fg' : 'text-ink-2')}>
            {waitingTime(st.entered_at)}
          </span>
          {overdue && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-crit-fg">
              <AlertTriangle className="h-3 w-3" /> past due
            </div>
          )}
        </Td>

        <Td className="whitespace-nowrap">
          <Badge tone={STATE_TONE[state]} dot>{WORKFLOW_LABEL[state]}</Badge>
        </Td>

        <Td className="whitespace-nowrap">
          {state === 'in_review' ? (
            <div className="flex items-center gap-1.5">
              <button onClick={handleApprove} disabled={approving} className={buttonClass('primary', 'sm')}>
                {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Approve
              </button>
              <button
                onClick={() => setPanel(p => (p === 'return' ? null : 'return'))}
                className={buttonClass('danger', 'sm')}
              >
                <XCircle className="h-3 w-3" /> Return
              </button>
              <button
                onClick={() => setPanel(p => (p === 'detail' ? null : 'detail'))}
                className={buttonClass('ghost', 'sm')}
                aria-label="Show result detail and history"
              >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', panel === 'detail' && 'rotate-180')} />
              </button>
            </div>
          ) : state === 'awaiting_review' || state === 'returned' ? (
            <span className="text-[12px] text-ink-3">With the analyst</span>
          ) : (
            <span className="flex items-center gap-1.5 text-[12px] text-ok-fg">
              <CheckCircle2 className="h-3 w-3" /> {WORKFLOW_LABEL[state]}
            </span>
          )}
        </Td>
      </Tr>

      {/* Earlier return on this result — review history is not erased when
          the analyst re-submits. */}
      {st.rejection_reason && (
        <tr className="bg-warn-bg/40">
          <td colSpan={11} className="border-b border-line px-3 pb-2 pt-0">
            <div className="flex items-start gap-2 rounded-md border border-warn-line bg-surface px-2.5 py-1.5 text-[12px]">
              <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn-fg" />
              <p className="text-ink-2">
                <span className="font-medium text-warn-fg">
                  Previously returned by {personName(st.returned_by_profile)}:
                </span>{' '}
                {st.rejection_reason}
              </p>
            </div>
          </td>
        </tr>
      )}

      {panel === 'detail' && (
        <tr className="bg-surface-muted">
          <td colSpan={11} className="border-b border-line px-3 py-3">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12px] md:grid-cols-4">
              <Detail label="Analyst notes" value={st.analyst_notes ?? '—'} />
              <Detail label="Matrix" value={st.samples?.matrix_type?.replace(/_/g, ' ') ?? '—'} />
              <Detail label="Sample description" value={st.samples?.description ?? '—'} />
              <Detail label="Collected" value={st.samples?.collection_date
                ? new Date(st.samples.collection_date).toLocaleDateString() : '—'} />
              <Detail label="Entered" value={st.entered_at ? new Date(st.entered_at).toLocaleString() : '—'} />
              <Detail label="Review round" value={String(st.review_round ?? 1)} />
              <Detail label="Category" value={st.tests?.category ?? '—'} />
              <Detail label="Method" value={st.tests?.method ?? '—'} />
            </dl>
            <div className="mt-3 flex gap-2">
              {order?.id && (
                <Link href={`${orderBasePath}/${order.id}`} className={buttonClass('secondary', 'sm')}>
                  View order
                </Link>
              )}
            </div>
          </td>
        </tr>
      )}

      {panel === 'return' && (
        <tr className="bg-crit-bg/40">
          <td colSpan={11} className="border-b border-line px-3 py-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[280px] flex-1">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.05em] text-crit-fg">
                  Reason for returning this result
                </span>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={`Explain what needs to be corrected (min ${MIN_COMMENT_LENGTH} characters)…`}
                  className={cn(FIELD, 'w-full border-crit-line')}
                />
              </label>
              <button
                onClick={handleReject}
                disabled={rejecting || noteTooShort}
                title={noteTooShort ? `At least ${MIN_COMMENT_LENGTH} characters are required` : undefined}
                className={buttonClass('danger', 'md')}
              >
                {rejecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <Undo2 className="h-3.5 w-3.5" /> Send back to analyst
              </button>
              <button onClick={() => setPanel(null)} className={buttonClass('ghost', 'md')}>Cancel</button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.05em] text-ink-4">{label}</dt>
      <dd className="mt-0.5 text-ink-2">{value}</dd>
    </div>
  )
}

export default function ReviewQueueTable({
  rows, orderBasePath = '/admin/orders',
}: {
  rows: SampleTest[]
  orderBasePath?: string
}) {
  if (rows.length === 0) {
    return (
      <TableWrap>
        <EmptyState
          icon={ClipboardCheck}
          title="No results awaiting review"
          description="When an analyst assigns a result to a reviewer it appears here."
        />
      </TableWrap>
    )
  }

  return (
    <>
      <Toaster position="top-center" />
      <TableWrap maxHeight="calc(100vh - 250px)">
        <Table>
          <thead>
            <tr>
              <Th width="140px">Order</Th>
              <Th width="110px">Sample</Th>
              <Th>Test</Th>
              <Th width="130px">Result</Th>
              <Th width="120px">Analyst</Th>
              <Th width="130px">Reviewer</Th>
              <Th width="90px">Priority</Th>
              <Th width="90px">Submitted</Th>
              <Th width="90px">Waiting</Th>
              <Th width="130px">Status</Th>
              <Th width="210px">Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(st => <ReviewRow key={st.id} st={st} orderBasePath={orderBasePath} />)}
          </tbody>
        </Table>
      </TableWrap>
    </>
  )
}
