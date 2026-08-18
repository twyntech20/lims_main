import Link from 'next/link'
import {
  Activity, CheckCircle2, FileText, FlaskConical, GitPullRequestArrow,
  PenLine, Plus, Send, Trash2, Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Mono } from '@/components/ui/primitives'
import Card from '@/components/dashboard/Card'

export interface ActivityEvent {
  id: string
  /** Plain-language headline: "Order ORD-1048 approved". */
  headline: string
  /** Who did it, and any extra context. */
  detail: string
  at: string
  action: string
  /** Set when several identical events were collapsed into one row. */
  repeated?: number
  /** Order number or record reference, shown as a monospace tag. */
  reference?: string | null
  href?: string
}

const ICON: Record<string, { icon: React.ElementType; tone: string }> = {
  result_submitted_for_review: { icon: Send,                tone: 'text-info-fg bg-info-bg' },
  result_approved:             { icon: CheckCircle2,        tone: 'text-ok-fg bg-ok-bg' },
  result_returned_for_changes: { icon: Undo2,               tone: 'text-crit-fg bg-crit-bg' },
  result_entered:              { icon: PenLine,             tone: 'text-ink-2 bg-surface-sunken' },
  submitted_to_client:         { icon: Send,                tone: 'text-ok-fg bg-ok-bg' },
  amendment_requested:         { icon: GitPullRequestArrow, tone: 'text-review-fg bg-review-bg' },
  amendment_applied:           { icon: GitPullRequestArrow, tone: 'text-review-fg bg-review-bg' },
  pdf_generated:               { icon: FileText,            tone: 'text-ink-2 bg-surface-sunken' },
  sample_received:             { icon: FlaskConical,        tone: 'text-info-fg bg-info-bg' },
  INSERT:                      { icon: Plus,                tone: 'text-ink-2 bg-surface-sunken' },
  UPDATE:                      { icon: PenLine,             tone: 'text-ink-2 bg-surface-sunken' },
  DELETE:                      { icon: Trash2,              tone: 'text-crit-fg bg-crit-bg' },
}

function clockTime(at: string) {
  return new Date(at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(at: string) {
  const d = new Date(at)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const yesterday = new Date(today.getTime() - 86_400_000)
  if (isToday) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })
}

/**
 * Audit trail as a timeline. Runs of identical events — a catalog
 * import writing hundreds of near-identical rows, for instance — are
 * collapsed into a single line with a count, so a genuine workflow
 * event is never buried by bulk maintenance.
 */
export default function RecentActivity({
  events, href,
}: {
  events: ActivityEvent[]
  href: string
}) {
  return (
    <Card
      title="Recent activity"
      subtitle={events.length === 0 ? 'No recorded events' : 'Newest first, from the audit trail'}
      actionHref={href}
      actionLabel="Full log"
      padded={false}
      className="min-h-0"
    >
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <span className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken">
            <Activity className="h-4.5 w-4.5 text-ink-4" />
          </span>
          <p className="text-[13px] font-medium text-ink">No activity recorded yet</p>
          <p className="mt-1 text-[12px] text-ink-3">Workflow events appear here as soon as work begins.</p>
        </div>
      ) : (
        <>
          <ol className="px-4 py-3">
            {events.map((e, i) => {
              const meta = ICON[e.action] ?? { icon: Activity, tone: 'text-ink-2 bg-surface-sunken' }
              const Icon = meta.icon
              const row = (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <p className="min-w-0 text-[12.5px] font-medium text-ink">
                      {e.headline}
                      {e.repeated && e.repeated > 1 && (
                        <span className="ml-1.5 rounded bg-surface-sunken px-1 py-px text-[10.5px] font-semibold tabular text-ink-3">
                          ×{e.repeated}
                        </span>
                      )}
                    </p>
                    <span className="shrink-0 tabular text-[11px] text-ink-4" title={new Date(e.at).toLocaleString('en-AU')}>
                      {dayLabel(e.at)} {clockTime(e.at)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
                    {e.detail}
                    {e.reference && <Mono className="ml-1.5 text-ink-4">{e.reference}</Mono>}
                  </p>
                </>
              )

              return (
                <li key={e.id} className="relative flex gap-3 pb-3.5 last:pb-0">
                  {i < events.length - 1 && (
                    <span aria-hidden="true" className="absolute left-[11px] top-6 h-full w-px bg-line" />
                  )}
                  <span className={cn('relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full', meta.tone)}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {e.href
                      ? <Link href={e.href} className="block rounded transition-colors hover:opacity-80">{row}</Link>
                      : row}
                  </div>
                </li>
              )
            })}
          </ol>
          <div className="mt-auto border-t border-line px-4 py-2 text-center">
            <Link href={href} className="text-[12px] font-medium text-brand-600 hover:text-brand-700">
              View full audit log →
            </Link>
          </div>
        </>
      )}
    </Card>
  )
}
