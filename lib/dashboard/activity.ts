import { personName } from '@/lib/workflow'
import type { ActivityEvent } from '@/components/dashboard/RecentActivity'

/* ============================================================
   Audit trail → readable timeline.

   Nothing here invents an event: every row comes from audit_logs.
   The only transformation is phrasing (an action name becomes a
   sentence) and collapsing consecutive identical events, so a bulk
   catalog import cannot bury a single result approval.
   ============================================================ */

export interface AuditRow {
  id: string
  action: string
  table_name: string | null
  record_id: string | null
  created_at: string
  profiles: { first_name?: string | null; last_name?: string | null; email?: string | null } | null
}

/** Resolved human reference for an audited record. */
export interface RecordRef {
  label: string
  href?: string
}

const SUBJECT: Record<string, { one: string; many: string }> = {
  orders:       { one: 'Order',   many: 'Orders' },
  samples:      { one: 'Sample',  many: 'Samples' },
  sample_tests: { one: 'Result',  many: 'Results' },
  tests:        { one: 'Catalog test', many: 'Catalog tests' },
  profiles:     { one: 'User',    many: 'Users' },
  clients:      { one: 'Client',  many: 'Clients' },
  amendments:   { one: 'Amendment', many: 'Amendments' },
}

/** Workflow actions carry their own wording; CRUD actions are templated. */
const WORKFLOW_HEADLINE: Record<string, string> = {
  result_submitted_for_review: 'Results submitted for review',
  result_approved:             'Result approved',
  result_returned_for_changes: 'Result returned to the analyst',
  result_entered:              'Result entered',
  submitted_to_client:         'Report released to client',
  amendment_requested:         'Amendment requested',
  amendment_applied:           'Amendment applied',
  pdf_generated:               'Report generated',
  sample_received:             'Sample received',
}

const CRUD_VERB: Record<string, string> = {
  INSERT: 'created',
  UPDATE: 'updated',
  DELETE: 'deleted',
}

function headlineFor(action: string, table: string | null, plural: boolean): string {
  const workflow = WORKFLOW_HEADLINE[action]
  if (workflow) return workflow

  const subject = SUBJECT[table ?? ''] ?? { one: table ?? 'Record', many: `${table ?? 'Record'}s` }
  const verb = CRUD_VERB[action]
  if (verb) return `${plural ? subject.many : subject.one} ${verb}`

  // Unknown action: show it rather than dropping the event.
  return `${subject.one} · ${action.replace(/_/g, ' ')}`
}

/**
 * Collapses runs of consecutive same-action, same-table events into a
 * single line carrying a count, then keeps the newest `limit` lines.
 * Rows must already be sorted newest-first.
 */
export function buildActivity(
  rows: AuditRow[],
  refs: Map<string, RecordRef>,
  limit = 8,
): ActivityEvent[] {
  const groups: { rows: AuditRow[] }[] = []

  for (const row of rows) {
    const head = groups[groups.length - 1]
    const prev = head?.rows[0]
    if (prev && prev.action === row.action && prev.table_name === row.table_name
        && personName(prev.profiles) === personName(row.profiles)) {
      head.rows.push(row)
    } else {
      groups.push({ rows: [row] })
    }
  }

  return groups.slice(0, limit).map(({ rows: group }) => {
    const first = group[0]
    const repeated = group.length
    const ref = repeated === 1 && first.record_id ? refs.get(first.record_id) : undefined
    const actor = personName(first.profiles)

    return {
      id: first.id,
      action: first.action,
      at: first.created_at,
      repeated,
      headline: headlineFor(first.action, first.table_name, repeated > 1),
      detail: repeated > 1
        ? `${actor} · ${repeated} records in one operation`
        : actor,
      reference: ref?.label ?? (repeated === 1 && first.record_id ? String(first.record_id).slice(0, 8) : null),
      href: ref?.href,
    }
  })
}
