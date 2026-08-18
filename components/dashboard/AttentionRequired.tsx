import Link from 'next/link'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Card from '@/components/dashboard/Card'

export type Severity = 'crit' | 'warn' | 'info'

export interface AttentionItem {
  key: string
  label: string
  detail: string
  count: number
  href: string
  severity: Severity
  icon: React.ElementType
}

const SEVERITY: Record<Severity, { row: string; chip: string; icon: string }> = {
  crit: { row: 'hover:bg-crit-bg/50', chip: 'bg-crit-bg text-crit-fg border-crit-line', icon: 'text-crit-fg' },
  warn: { row: 'hover:bg-warn-bg/50', chip: 'bg-warn-bg text-warn-fg border-warn-line', icon: 'text-warn-fg' },
  info: { row: 'hover:bg-info-bg/50', chip: 'bg-info-bg text-info-fg border-info-line', icon: 'text-info-fg' },
}

const ORDER: Severity[] = ['crit', 'warn', 'info']

/**
 * Exceptions only. An item appears when its count is non-zero, sorted
 * by severity, and every row is a link into the queue already filtered
 * to exactly those records — so the panel is a to-do list, not a report.
 */
export default function AttentionRequired({ items }: { items: AttentionItem[] }) {
  const active = items
    .filter(i => i.count > 0)
    .sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity) || b.count - a.count)

  const critical = active.filter(i => i.severity === 'crit').length

  return (
    <Card
      title="Attention required"
      subtitle={active.length === 0 ? 'Nothing is blocked' : `${active.length} item${active.length === 1 ? '' : 's'}${critical > 0 ? ` · ${critical} critical` : ''}`}
      padded={false}
    >
      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <span className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-ok-bg">
            <CheckCircle2 className="h-4.5 w-4.5 text-ok-fg" />
          </span>
          <p className="text-[13px] font-medium text-ink">Nothing needs attention</p>
          <p className="mt-1 text-[12px] text-ink-3">No overdue, returned or blocked work right now.</p>
        </div>
      ) : (
        <ul>
          {active.map(item => {
            const s = SEVERITY[item.severity]
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 border-b border-line px-4 py-2.5 transition-colors last:border-b-0',
                    s.row,
                  )}
                >
                  <item.icon className={cn('h-4 w-4 shrink-0', s.icon)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{item.label}</p>
                    <p className="truncate text-[11.5px] text-ink-3">{item.detail}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold tabular',
                      s.chip,
                    )}
                  >
                    {item.count}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-4" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
