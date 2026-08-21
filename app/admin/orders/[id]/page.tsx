import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, FileText, Pencil, Activity, FlaskConical } from 'lucide-react'
import { formatDate, formatDateTime, getPriorityLabel } from '@/lib/utils'
import AssignAnalystForm from '@/components/orders/AssignAnalystForm'
import UpdateStatusForm from '@/components/orders/UpdateStatusForm'
import AddSampleForm from '@/components/orders/AddSampleForm'
import SubmitToClientPanel from '@/components/orders/SubmitToClientPanel'
import { personName, workflowState, WORKFLOW_LABEL, waitingTime, isOverdue, isOrderReleased } from '@/lib/workflow'
import {
  Page, Section, Panel, Badge, Mono, ButtonLink, EmptyState,
  Table, Th, Td, Tr, TableWrap, type Tone,
} from '@/components/ui/primitives'
import { Timeline, ProgressCell } from '@/components/ui/metrics'

const STATUS: Record<string, { label: string; tone: Tone }> = {
  new:         { label: 'New',         tone: 'neutral' },
  submitted:   { label: 'Submitted',   tone: 'info' },
  in_progress: { label: 'In Progress', tone: 'warn' },
  review:      { label: 'In Review',   tone: 'review' },
  completed:   { label: 'Released',    tone: 'ok' },
  cancelled:   { label: 'Cancelled',   tone: 'neutral' },
}

const RESULT_TONE: Record<string, Tone> = {
  awaiting_entry: 'neutral', returned: 'crit', awaiting_review: 'warn',
  in_review: 'review', approved: 'ok', released: 'solid',
}

const ACTION_LABEL: Record<string, string> = {
  result_submitted_for_review: 'Sent for review',
  result_approved:             'Result approved',
  result_returned_for_changes: 'Result returned',
  submitted_to_client:         'Released to client',
  amendment_applied:           'Amendment applied',
  pdf_generated:               'Report generated',
  INSERT: 'Created', UPDATE: 'Updated', DELETE: 'Deleted',
}

interface Props { params: Promise<{ id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [orderRes, analystsRes, testsRes] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        *,
        clients(id, client_name, email, phone),
        profiles!orders_assigned_analyst_id_fkey(id, first_name, last_name, email),
        released_by_profile:profiles!orders_released_by_fkey(id, first_name, last_name, email),
        samples(
          id, sample_id, description, matrix_type, collection_date, collection_location, status,
          sample_tests(
            id, status, result, unit, qualifier, mdl, returned_at, assigned_reviewer_id,
            approved_at, entered_at,
            tests(id, name, code, category, method, unit, mdl),
            entered_by_profile:profiles!sample_tests_entered_by_fkey(first_name, last_name, email),
            approved_by_profile:profiles!sample_tests_approved_by_fkey(first_name, last_name, email)
          )
        )
      `)
      .eq('id', id)
      .single(),
    supabase.from('profiles')
      .select('id, first_name, last_name, email, role, specialty_chemistry, specialty_microbiology')
      .eq('role', 'analyst').is('deleted_at', null).order('first_name'),
    supabase.from('tests').select('id, name, code, category').eq('is_active', true).order('category').order('name'),
  ])

  if (orderRes.error || !orderRes.data) notFound()
  const order = orderRes.data as any
  const analysts = analystsRes.data ?? []
  const tests = testsRes.data ?? []

  const samples = order.samples ?? []
  const allSampleTests = samples.flatMap((s: any) => s.sample_tests ?? [])
  // Departments this order covers, for the assignment picker. Derived from
  // the tests already loaded above rather than a second query.
  const orderCategories = allSampleTests.map((st: any) => st.tests?.category as string | null)
  const notApproved = allSampleTests.filter((st: any) => st.status !== 'approved')
  const approvedCount = allSampleTests.length - notApproved.length
  const readyToRelease = allSampleTests.length > 0 && notApproved.length === 0
  const isReleased = isOrderReleased(order)
  const overdue = isOverdue(order.date_due) && !['completed', 'cancelled'].includes(order.status)
  const meta = STATUS[order.status] ?? { label: order.status, tone: 'neutral' as Tone }

  // Audit trail for this order and every result on it.
  const recordIds = [order.id, ...allSampleTests.map((st: any) => st.id)]
  const { data: auditRows } = await supabase
    .from('audit_logs')
    .select('id, action, table_name, record_id, created_at, profiles ( first_name, last_name, email )')
    .in('record_id', recordIds)
    .order('created_at', { ascending: false })
    .limit(25)

  const approvedRows = allSampleTests
    .filter((st: any) => st.status === 'approved')
    .map((st: any) => ({
      id: st.id,
      testName: st.tests?.name ?? '—',
      result: st.result,
      unit: st.unit,
      qualifier: st.qualifier,
      sampleId: samples.find((s: any) => s.sample_tests?.some((t: any) => t.id === st.id))?.sample_id ?? '—',
      reviewerName: personName(st.approved_by_profile),
      approvedAt: st.approved_at,
    }))

  const firstApproval = allSampleTests
    .map((st: any) => st.approved_at).filter(Boolean).sort()[0] ?? null
  const anyEntered = allSampleTests.some((st: any) => st.entered_at)

  const steps = [
    { label: 'Received',  at: order.date_received,  done: !!order.date_received },
    { label: 'Assigned',  at: order.date_assigned,  done: !!order.assigned_analyst_id,
      by: order.profiles ? personName(order.profiles) : undefined,
      current: !!order.assigned_analyst_id && !anyEntered },
    { label: 'Testing',   done: anyEntered,
      note: allSampleTests.length ? `${approvedCount}/${allSampleTests.length} results approved` : undefined,
      current: anyEntered && !readyToRelease },
    { label: 'Review',    done: allSampleTests.some((st: any) => st.status === 'reviewed' || st.status === 'approved'),
      current: order.status === 'review' && !readyToRelease },
    { label: 'Approved',  at: firstApproval, done: readyToRelease, current: readyToRelease && !isReleased },
    { label: 'Released',  at: order.released_at, done: isReleased,
      by: isReleased ? personName(order.released_by_profile) : undefined },
  ]

  return (
    <Page wide>
      {/* ── Order header ── */}
      <div className="mb-5">
        <Link href="/admin/orders" className="mb-2 inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Orders
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-[-0.01em] text-ink">
                <Mono className="text-[19px]">{order.order_number}</Mono>
              </h1>
              <Badge tone={meta.tone} dot>{meta.label}</Badge>
              {order.priority !== 'normal' && (
                <Badge tone={order.priority === 'same_day' ? 'crit' : 'warn'} dot>
                  {getPriorityLabel(order.priority)}
                </Badge>
              )}
              {overdue && (
                <Badge tone="crit"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>
              )}
            </div>
            <p className="mt-1 text-[13px] text-ink-3">
              {order.clients?.client_name ?? '—'} · Created {formatDateTime(order.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={`/admin/orders/${order.id}/edit`}><Pencil className="h-3.5 w-3.5" /> Edit</ButtonLink>
            <ButtonLink href={`/admin/orders/${order.id}/coc`}><FileText className="h-3.5 w-3.5" /> Print COC</ButtonLink>
            {(isReleased || approvedRows.length > 0) && (
              <ButtonLink href={`/admin/reports/${order.id}`} variant="primary">
                <FileText className="h-3.5 w-3.5" /> {isReleased ? 'View report' : 'Preview report'}
              </ButtonLink>
            )}
          </div>
        </div>

        {/* Key facts strip */}
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-xs sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Client"   value={order.clients?.client_name ?? '—'} />
          <Fact label="Contact"  value={order.customer_name ?? '—'} />
          <Fact label="Analyst"  value={order.profiles ? personName(order.profiles) : 'Unassigned'} />
          <Fact label="Received" value={formatDate(order.date_received)} />
          <Fact label="Due"      value={formatDate(order.date_due)} tone={overdue ? 'crit' : undefined} />
          <Fact label="Progress" value={`${approvedCount}/${allSampleTests.length} approved`} />
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left column ── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Samples & results */}
          <Section title="Samples and results" description={`${samples.length} sample${samples.length === 1 ? '' : 's'} · ${allSampleTests.length} analyses`}>
            {samples.length === 0 ? (
              <Panel><EmptyState icon={FlaskConical} title="No samples on this order yet" compact /></Panel>
            ) : (
              <div className="space-y-3">
                {samples.map((sample: any) => {
                  const rows = sample.sample_tests ?? []
                  const done = rows.filter((r: any) => r.status === 'approved').length
                  return (
                    <Panel key={sample.id} className="overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-muted px-3.5 py-2.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Mono className="text-[13px] font-medium text-ink">{sample.sample_id}</Mono>
                          {sample.matrix_type && (
                            <span className="text-[12px] text-ink-3">{sample.matrix_type.replace(/_/g, ' ')}</span>
                          )}
                          {sample.description && (
                            <span className="max-w-[280px] truncate text-[12px] text-ink-4">{sample.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {sample.collection_date && (
                            <span className="text-[11px] text-ink-4">Collected {formatDate(sample.collection_date)}</span>
                          )}
                          {rows.length > 0 && <ProgressCell done={done} total={rows.length} />}
                        </div>
                      </div>

                      {rows.length === 0 ? (
                        <p className="px-3.5 py-3 text-[12px] text-ink-4">No analyses on this sample.</p>
                      ) : (
                        <Table>
                          <thead>
                            <tr>
                              <Th>Analysis</Th>
                              <Th width="120px">Result</Th>
                              <Th width="90px">MDL</Th>
                              <Th width="140px">Analyst</Th>
                              <Th width="150px">Status</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((st: any) => {
                              const state = workflowState({
                                status: st.status,
                                returned_at: st.returned_at,
                                assigned_reviewer_id: st.assigned_reviewer_id,
                                order_released_at: order.released_at,
                              })
                              const display = st.qualifier === 'ND'
                                ? 'ND' : [st.qualifier, st.result].filter(Boolean).join(' ') || '—'
                              return (
                                <Tr key={st.id} flag={state === 'returned' ? 'crit' : undefined}>
                                  <Td>
                                    <div className="font-medium text-ink">{st.tests?.name ?? '—'}</div>
                                    <div className="mt-0.5 text-[11px] text-ink-4">
                                      {st.tests?.code && <Mono className="text-[11px]">{st.tests.code}</Mono>}
                                      {st.tests?.method && <span> · {st.tests.method}</span>}
                                    </div>
                                  </Td>
                                  <Td className="tabular whitespace-nowrap">
                                    <span className="font-medium text-ink">{display}</span>{' '}
                                    <span className="text-ink-4">{st.unit ?? ''}</span>
                                  </Td>
                                  <Td className="tabular text-[12px] text-ink-3">{st.mdl ?? st.tests?.mdl ?? '—'}</Td>
                                  <Td className="whitespace-nowrap text-[12px]">{personName(st.entered_by_profile)}</Td>
                                  <Td className="whitespace-nowrap">
                                    <Badge tone={RESULT_TONE[state]} dot>{WORKFLOW_LABEL[state]}</Badge>
                                  </Td>
                                </Tr>
                              )
                            })}
                          </tbody>
                        </Table>
                      )}
                    </Panel>
                  )
                })}
              </div>
            )}

            {!['completed', 'cancelled'].includes(order.status) && (
              <div className="mt-3">
                <Panel padded><AddSampleForm orderId={order.id} tests={tests} /></Panel>
              </div>
            )}
          </Section>

          {/* Chain-of-custody metadata */}
          {order.notes && (() => {
            let coc: Record<string, string> = {}
            try { coc = JSON.parse(order.notes) } catch { return null }
            const entries = Object.entries(coc).filter(([, v]) => v !== null && v !== '' && v !== 'null')
            if (entries.length === 0) return null
            return (
              <Section title="Chain of custody">
                <Panel padded>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 md:grid-cols-3">
                    {entries.map(([k, v]) => (
                      <Fact key={k} label={k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} value={String(v)} />
                    ))}
                  </dl>
                </Panel>
              </Section>
            )
          })()}

          {/* Audit history */}
          <Section
            title="Activity and audit history"
            actions={<Link href="/admin/system-logs" className="text-[12px] font-medium text-brand-600 hover:text-brand-700">Full audit log →</Link>}
          >
            <Panel className="overflow-hidden">
              {!auditRows?.length ? (
                <EmptyState icon={Activity} title="No recorded activity for this order" compact />
              ) : (
                <TableWrap className="rounded-none border-0 shadow-none" maxHeight="360px">
                  <Table>
                    <thead>
                      <tr>
                        <Th width="170px">Event</Th>
                        <Th width="120px">Record</Th>
                        <Th>User</Th>
                        <Th width="160px">When</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRows.map((row: any) => (
                        <Tr key={row.id}>
                          <Td><span className="font-medium text-ink">{ACTION_LABEL[row.action] ?? row.action}</span></Td>
                          <Td className="text-[12px] text-ink-3">{row.table_name}</Td>
                          <Td className="text-[12px]">{personName(row.profiles)}</Td>
                          <Td className="tabular whitespace-nowrap text-[12px] text-ink-3">
                            {formatDateTime(row.created_at)}
                            <span className="ml-1.5 text-ink-4">({waitingTime(row.created_at)} ago)</span>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )}
            </Panel>
          </Section>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          <Section title="Workflow">
            <Panel padded><Timeline steps={steps} /></Panel>
          </Section>

          <Section title="Release">
            {isReleased ? (
              <div className="rounded-lg border border-ok-line bg-ok-bg p-3.5">
                <p className="text-[13px] font-medium text-ok-fg">Submitted to Client</p>
                <p className="mt-1.5 text-[12px] text-ink-2">
                  This order has already been released to the client.
                </p>
                {/* Orders completed by the check_order_completion trigger carry
                    no release attribution, so both lines are conditional. */}
                {order.released_by_profile && (
                  <p className="mt-1 text-[12px] text-ink-2">by {personName(order.released_by_profile)}</p>
                )}
                {order.released_at && (
                  <p className="tabular text-[12px] text-ink-3">{formatDateTime(order.released_at)}</p>
                )}
                <ButtonLink href={`/admin/reports/${order.id}`} size="sm" className="mt-3">
                  <FileText className="h-3 w-3" /> View approved report
                </ButtonLink>
              </div>
            ) : readyToRelease ? (
              <SubmitToClientPanel
                orderId={order.id}
                orderNumber={order.order_number}
                clientName={order.clients?.client_name ?? order.customer_name ?? '—'}
                rows={approvedRows}
                released={isReleased}
                releasedAt={order.released_at}
                releasedBy={order.released_by_profile ? personName(order.released_by_profile) : null}
              />
            ) : (
              <Panel padded>
                <p className="text-[13px] font-medium text-ink">Not ready for release</p>
                <p className="mt-1 text-[12px] text-ink-3">
                  {allSampleTests.length === 0
                    ? 'This order has no analyses yet.'
                    : `${notApproved.length} of ${allSampleTests.length} result(s) still need to be entered, reviewed or approved.`}
                </p>
              </Panel>
            )}
          </Section>

          <Section title="Assignment">
            <Panel padded>
              <AssignAnalystForm
                orderId={order.id}
                currentAnalystId={order.assigned_analyst_id}
                analysts={analysts}
                orderCategories={orderCategories}
              />
            </Panel>
          </Section>

          <Section title="Status">
            <Panel padded>
              <UpdateStatusForm orderId={order.id} currentStatus={order.status} />
            </Panel>
          </Section>

          <Section title="Client">
            <Panel padded>
              <dl className="space-y-2.5">
                <Fact label="Company" value={order.clients?.client_name ?? '—'} />
                <Fact label="Contact" value={order.customer_name ?? '—'} />
                <Fact label="Email"   value={order.customer_email ?? order.clients?.email ?? '—'} />
                <Fact label="Phone"   value={order.customer_phone ?? order.clients?.phone ?? '—'} />
                {order.shipping_address && <Fact label="Address" value={order.shipping_address} />}
              </dl>
            </Panel>
          </Section>
        </div>
      </div>
    </Page>
  )
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'crit' }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.05em] text-ink-4">{label}</dt>
      <dd className={`mt-0.5 truncate text-[13px] font-medium ${tone === 'crit' ? 'text-crit-fg' : 'text-ink'}`}>
        {value}
      </dd>
    </div>
  )
}
