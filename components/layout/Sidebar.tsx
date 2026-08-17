'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ClipboardList, FlaskConical, FolderOpen, BarChart3,
  Briefcase, Users, FileText, Activity, Bell, Layers, ClipboardCheck,
  GitPullRequestArrow, FileEdit, ScrollText, LogOut, ChevronLeft, ChevronRight,
  TestTube, Inbox, UserCircle
} from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import type { UserRole } from '@/lib/types/database'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/admin/dashboard',     icon: LayoutDashboard },
  { label: 'Orders',       href: '/admin/orders',         icon: ClipboardList },
  { label: 'Samples',      href: '/admin/samples',        icon: FlaskConical },
  { label: 'Projects',     href: '/admin/projects',       icon: FolderOpen },
  { label: 'Results',      href: '/admin/results',        icon: BarChart3 },
  { label: 'Work Queue',   href: '/admin/work-queue',     icon: Inbox },
  { label: 'Review Queue', href: '/admin/review-queue',   icon: ClipboardCheck },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Amendments',   href: '/admin/amendments',     icon: GitPullRequestArrow },
  { label: 'Tests',        href: '/admin/tests',          icon: TestTube },
  { label: 'Clients',      href: '/admin/clients',        icon: Briefcase },
  { label: 'Worksheets',   href: '/admin/worksheets',     icon: Layers },
  { label: 'Users',        href: '/admin/users',          icon: Users },
  { label: 'Reports',      href: '/admin/reports',        icon: FileText },
  { label: 'Form Builder', href: '/admin/form-builder',   icon: FileEdit },
  { label: 'System Logs',  href: '/admin/system-logs',    icon: ScrollText },
]

// No separate "Results" route — approved results live in the Work Queue's
// own Approved tab (app/analyst/work-queue/page.tsx) rather than a
// duplicate page, so there's nothing else to link to here.
const ANALYST_NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/analyst/dashboard',    icon: LayoutDashboard },
  { label: 'Work Queue',   href: '/analyst/work-queue',   icon: Inbox },
  { label: 'Review Queue', href: '/analyst/review-queue', icon: ClipboardCheck },
  { label: 'Notifications', href: '/analyst/notifications', icon: Bell },
]

const CLIENT_NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/client/dashboard',     icon: LayoutDashboard },
  { label: 'My Orders',    href: '/client/orders',        icon: ClipboardList },
  { label: 'New Order',    href: '/client/orders/new',    icon: ClipboardCheck },
]

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
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
  const nav = (NAV_BY_ROLE[role] ?? []).filter(
    item => !(role === 'analyst' && item.href === '/analyst/review-queue' && !canReview)
  )

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className={cn(
      'relative flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 shrink-0',
      collapsed ? 'w-14' : 'w-[280px]'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-100">
        {!collapsed && (
          <div className="flex flex-col items-center w-full">
            <Image
              src="https://fqlabs.com/wp-content/uploads/2020/01/weblogo.png"
              alt="FQLabs"
              width={220}
              height={84}
              style={{ objectFit: 'contain' }}
              unoptimized
              priority
            />
            <p className="text-[11px] font-bold text-gray-600 tracking-wide uppercase text-center mt-1 leading-tight">
              Laboratory Information System
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {nav.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors mx-1 rounded',
                active
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && unreadCount > 0 && item.href.includes('notification') && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-100 p-2">
        {!collapsed && (
          <p className="text-xs text-gray-400 px-3 py-1 truncate">{userName}</p>
        )}
        {/* Profile link — only for admin/manager roles */}
        {(role === 'admin' || role === 'manager') && (
          <Link
            href="/admin/profile"
            title={collapsed ? 'Profile' : undefined}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded transition mx-auto mb-1',
              pathname.startsWith('/admin/profile')
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <UserCircle className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Profile</span>}
          </Link>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Logout' : undefined}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 rounded transition mx-auto"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
