import Link from 'next/link'
import { Bell, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIELD, ButtonLink } from '@/components/ui/primitives'
import DateRangeFilter from '@/components/dashboard/DateRangeFilter'
import type { Period } from '@/lib/dashboard/metrics'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/**
 * Dashboard masthead: who you are, what day it is, and the three
 * controls used most often. Search submits to the Orders list, which
 * already filters on order number and client, so the field does real
 * work rather than decorating the header.
 */
export default function DashboardHeader({
  name, dateLabel, summary, unreadCount, period, basePath, searchPath, newOrderHref, profileHref, notificationsHref,
}: {
  name: string
  dateLabel: string
  summary: React.ReactNode
  unreadCount: number
  period: Period
  basePath: string
  searchPath: string
  newOrderHref: string
  profileHref: string
  notificationsHref: string
}) {
  return (
    <header className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            Good day, {name}
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            <span className="text-ink-2">{dateLabel}</span>
            <span className="mx-1.5 text-ink-4">·</span>
            {summary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form action={searchPath} method="get" className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
            <input
              type="search"
              name="q"
              placeholder="Search orders or clients…"
              aria-label="Search orders or clients"
              className={cn(FIELD, 'w-[220px] pl-8 lg:w-[260px]')}
            />
          </form>

          <Link
            href={notificationsHref}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            className="relative flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-ink-3 shadow-xs transition-colors hover:border-line-strong hover:text-ink"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-crit-fg px-1 text-[10px] font-semibold leading-none text-white tabular">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          <Link
            href={profileHref}
            title={name}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
          >
            {initials(name)}
          </Link>

          <ButtonLink href={newOrderHref} variant="primary">
            <Plus className="h-3.5 w-3.5" /> New order
          </ButtonLink>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <DateRangeFilter period={period} basePath={basePath} />
        <span className="text-[12px] text-ink-4">
          Showing data {period.key === 'custom' ? `for ${period.phrase}` : period.phrase}
        </span>
      </div>
    </header>
  )
}
