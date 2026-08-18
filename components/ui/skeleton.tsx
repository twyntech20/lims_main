import { cn } from '@/lib/utils'
import { Page } from '@/components/ui/primitives'

/* ============================================================
   Loading skeletons.
   Each one mirrors the real layout it stands in for, so content
   does not jump when the data arrives.
   ============================================================ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-surface-sunken', className)} />
}

export function HeaderSkeleton({ withTabs = false }: { withTabs?: boolean }) {
  return (
    <div className="mb-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-2 h-3.5 w-72" />
      {withTabs && <Skeleton className="mt-4 h-8 w-full max-w-lg" />}
    </div>
  )
}

export function ToolbarSkeleton() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 shadow-xs">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-7 w-20" />
    </div>
  )
}

export function TableSkeleton({ rows = 6, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
      <div className="flex gap-4 border-b border-line bg-surface-muted px-3 py-2.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={cn('h-3', i === 0 ? 'w-28' : 'flex-1')} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-line px-3 py-3 last:border-b-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={cn('h-3.5', c === 0 ? 'w-28' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ cards = 6, height = 'h-[124px]' }: { cards?: number; height?: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className={cn('animate-pulse rounded-lg border border-line bg-surface shadow-xs', height)} />
      ))}
    </div>
  )
}

/** Whole-page skeleton for a filtered list screen. */
export function ListPageSkeleton({
  rows = 6, columns = 6, withTabs = false, wide = false, label = 'Loading…',
}: {
  rows?: number
  columns?: number
  withTabs?: boolean
  wide?: boolean
  label?: string
}) {
  return (
    <Page wide={wide}>
      <HeaderSkeleton withTabs={withTabs} />
      <ToolbarSkeleton />
      <TableSkeleton rows={rows} columns={columns} />
      <span className="sr-only">{label}</span>
    </Page>
  )
}
