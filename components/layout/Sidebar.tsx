'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ClipboardList, FlaskConical, FolderOpen, BarChart3,
  Briefcase, Users, FileText, Bell, Layers, ClipboardCheck,
  GitPullRequestArrow, FileEdit, ScrollText, LogOut, PanelLeftClose,
  PanelLeftOpen, TestTube, Inbox, UserCircle, Settings, Menu, X,
} from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import type { UserRole } from '@/lib/types/database'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  /** Renders the unread count from the layout. */
  badge?: 'notifications'
}

interface NavGroup {
  label: string
  items: NavItem[]
}

/* Routes are unchanged — only their grouping and presentation. */

const ADMIN_NAV: NavGroup[] = [
  { label: 'Operations', items: [
    { label: 'Dashboard',    href: '/admin/dashboard',     icon: LayoutDashboard },
    { label: 'Orders',       href: '/admin/orders',        icon: ClipboardList },
    { label: 'Samples',      href: '/admin/samples',       icon: FlaskConical },
    { label: 'Work Queue',   href: '/admin/work-queue',    icon: Inbox },
    { label: 'Review Queue', href: '/admin/review-queue',  icon: ClipboardCheck },
  ]},
  { label: 'Laboratory', items: [
    { label: 'Test Catalog', href: '/admin/tests',         icon: TestTube },
    { label: 'Worksheets',   href: '/admin/worksheets',    icon: Layers },
    { label: 'Results',      href: '/admin/results',       icon: BarChart3 },
  ]},
  { label: 'Management', items: [
    { label: 'Clients',      href: '/admin/clients',       icon: Briefcase },
    { label: 'Projects',     href: '/admin/projects',      icon: FolderOpen },
  ]},
  { label: 'Reporting', items: [
    { label: 'Reports',      href: '/admin/reports',       icon: FileText },
  ]},
  { label: 'Quality', items: [
    { label: 'Amendments',   href: '/admin/amendments',    icon: GitPullRequestArrow },
    { label: 'Audit Log',    href: '/admin/system-logs',   icon: ScrollText },
  ]},
  { label: 'Administration', items: [
    { label: 'Users',        href: '/admin/users',         icon: Users },
    { label: 'Settings',     href: '/admin/settings',      icon: Settings },
    { label: 'Form Builder', href: '/admin/form-builder',  icon: FileEdit },
  ]},
]

const ANALYST_NAV: NavGroup[] = [
  { label: 'Operations', items: [
    { label: 'Dashboard',    href: '/analyst/dashboard',    icon: LayoutDashboard },
    { label: 'Work Queue',   href: '/analyst/work-queue',   icon: Inbox },
    { label: 'Review Queue', href: '/analyst/review-queue', icon: ClipboardCheck },
  ]},
  { label: 'Activity', items: [
    { label: 'Notifications', href: '/analyst/notifications', icon: Bell, badge: 'notifications' },
  ]},
]

const CLIENT_NAV: NavGroup[] = [
  { label: 'Portal', items: [
    { label: 'Dashboard', href: '/client/dashboard',  icon: LayoutDashboard },
    { label: 'My Orders', href: '/client/orders',     icon: ClipboardList },
    { label: 'New Order', href: '/client/orders/new', icon: ClipboardCheck },
  ]},
]

const NAV_BY_ROLE: Record<UserRole, NavGroup[]> = {
  admin: ADMIN_NAV,
  manager: ADMIN_NAV,
  analyst: ANALYST_NAV,
  client: CLIENT_NAV,
}

interface Props {
  role: UserRole
  userName: string
  unreadCount?: number
  canReview?: boolean
}

export default function Sidebar({ role, userName, unreadCount = 0, canReview = false }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Admins get the notifications entry inside Quality-adjacent nav; it is
  // appended here so the shared group definition stays declarative.
  const groups = (NAV_BY_ROLE[role] ?? []).map(g =>
    role !== 'analyst' && g.label === 'Quality'
      ? { ...g, items: [...g.items, { label: 'Notifications', href: '/admin/notifications', icon: Bell, badge: 'notifications' as const }] }
      : g,
  )

  // An analyst without review rights has no Review Queue to open.
  const visibleGroups = groups
    .map(g => ({ ...g, items: g.items.filter(i => !(role === 'analyst' && i.href === '/analyst/review-queue' && !canReview)) }))
    .filter(g => g.items.length > 0)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const initials = userName
    .split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'U'

  const nav = (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {visibleGroups.map(group => (
        <div key={group.label} className="mb-4 last:mb-0">
          {!collapsed && (
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-4">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map(item => {
              const active = isActive(item.href)
              const showBadge = item.badge === 'notifications' && unreadCount > 0
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                      active
                        ? 'bg-brand-50 font-medium text-brand-700'
                        : 'text-ink-2 hover:bg-surface-sunken hover:text-ink',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    {/* Active marker is a shape, not only a colour. */}
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-brand-600" />
                    )}
                    <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand-600' : 'text-ink-4 group-hover:text-ink-3')} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && showBadge && (
                      <span className="ml-auto rounded-full bg-crit-fg px-1.5 py-px text-[10px] font-semibold tabular text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {collapsed && showBadge && (
                      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-crit-fg" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )

  const profileHref = role === 'analyst' ? '/analyst/dashboard' : '/admin/profile'

  const shell = (
    <>
      {/* Brand */}
      <div className={cn('flex h-14 items-center gap-2 border-b border-line px-3', collapsed && 'justify-center px-0')}>
        {collapsed ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-[12px] font-bold text-white">
            FQ
          </span>
        ) : (
          <Image
            src="https://fqlabs.com/wp-content/uploads/2020/01/weblogo.png"
            alt="FQLabs"
            width={124}
            height={30}
            style={{ objectFit: 'contain', height: 'auto' }}
            unoptimized
            priority
          />
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="ml-auto hidden rounded-md p-1 text-ink-4 transition-colors hover:bg-surface-sunken hover:text-ink-2 lg:block"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {nav}

      {/* User */}
      <div className="border-t border-line p-2">
        <Link
          href={profileHref}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-sunken',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? userName : undefined}
        >
          <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
            {initials}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink">{userName}</span>
              <span className="block text-[11px] capitalize text-ink-4">{role}</span>
            </span>
          )}
          {!collapsed && <UserCircle className="h-3.5 w-3.5 shrink-0 text-ink-4" />}
        </Link>
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'mt-0.5 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-crit-bg hover:text-crit-fg',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-ink-2 transition-colors hover:bg-surface-sunken"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-[13px] font-semibold text-ink">FQLabs LIMS</span>
        {unreadCount > 0 && (
          <span className="ml-auto rounded-full bg-crit-fg px-1.5 py-px text-[10px] font-semibold tabular text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/35"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[264px] flex-col bg-surface shadow-pop">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-3.5 rounded-md p-1 text-ink-4 hover:bg-surface-sunken"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {shell}
          </aside>
        </div>
      )}

      {/* Desktop rail */}
      <aside
        className={cn(
          'hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[60px]' : 'w-[228px]',
        )}
      >
        {shell}
      </aside>
    </>
  )
}
