import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Shared dashboard card frame: hairline border, quiet header, flat body. */
export default function Card({
  title, subtitle, action, actionHref, actionLabel, children, className, bodyClassName, padded = true,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  actionHref?: string
  actionLabel?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  padded?: boolean
}) {
  return (
    <section className={cn('flex flex-col rounded-lg border border-line bg-surface shadow-xs', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-[-0.005em] text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-[11.5px] text-ink-4">{subtitle}</p>}
        </div>
        {action ?? (actionHref && (
          <Link
            href={actionHref}
            className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            {actionLabel ?? 'View all'} <ArrowRight className="h-3 w-3" />
          </Link>
        ))}
      </div>
      <div className={cn('min-w-0 flex-1', padded && 'p-4', bodyClassName)}>{children}</div>
    </section>
  )
}
