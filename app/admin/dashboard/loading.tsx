import { Page } from '@/components/ui/primitives'

/* Skeleton mirrors the real grid, so nothing jumps when data lands. */

function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg border border-line bg-surface shadow-xs ${className}`} />
}

function Line({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-sunken ${className}`} />
}

export default function DashboardLoading() {
  return (
    <Page wide>
      <div className="mb-5">
        <Line className="h-6 w-56" />
        <Line className="mt-2 h-3.5 w-80" />
        <Line className="mt-4 h-8 w-72" />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Block key={i} className="h-[132px]" />)}
      </div>

      <div className="mb-3 grid gap-3 lg:grid-cols-3">
        <Block className="h-[320px] lg:col-span-2" />
        <Block className="h-[320px]" />
      </div>

      <div className="mb-3 grid gap-3 lg:grid-cols-2">
        <Block className="h-[236px]" />
        <Block className="h-[236px]" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Block className="h-[280px]" />
        <Block className="h-[280px]" />
      </div>

      <span className="sr-only">Loading dashboard…</span>
    </Page>
  )
}
