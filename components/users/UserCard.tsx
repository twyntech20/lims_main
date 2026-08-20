'use client'

import { useState, useTransition } from 'react'

import Link from 'next/link'
import { toggleUserActive, deleteUser, resetUserPassword } from '@/app/actions/users'
import { MoreVertical, KeyRound, Trash2, UserCheck, UserX, Edit, Mail, Phone, Copy } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Badge, buttonClass, type Tone } from '@/components/ui/primitives'

interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
  phone_number: string | null
  company_name: string | null
  specialty_chemistry: boolean
  specialty_microbiology: boolean
  specialties_list: string | null
}

interface Props {
  profile: Profile
  isAdmin: boolean
  isSelf: boolean
}

/* Role is a category, not a severity — each gets a distinct tone from
   the shared palette, and the label always carries the meaning. */
const ROLE_TONE: Record<string, Tone> = {
  admin: 'crit', manager: 'review', analyst: 'info', client: 'ok',
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$%^&*'
  const all = upper + lower + digits + special
  let pwd = upper[Math.floor(Math.random() * upper.length)]
    + lower[Math.floor(Math.random() * lower.length)]
    + digits[Math.floor(Math.random() * digits.length)]
    + special[Math.floor(Math.random() * special.length)]
  for (let i = 4; i < 14; i++) pwd += all[Math.floor(Math.random() * all.length)]
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}

export default function UserCard({ profile, isAdmin, isSelf }: Props) {
  const [open, setOpen] = useState(false)
  const [toggling, startToggle] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [resetting, startReset] = useTransition()
  // Holds a password only once Supabase has confirmed the change.
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null)

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
  const initials = (profile.first_name || profile.email)
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'U'
  const specialties = profile.specialties_list ? profile.specialties_list.split(',').filter(Boolean) : []
  const depts = [
    profile.specialty_chemistry && 'Chemistry',
    profile.specialty_microbiology && 'Microbiology',
  ].filter(Boolean) as string[]

  function handleToggle() {
    setOpen(false)
    startToggle(async () => {
      try {
        await toggleUserActive(profile.id, !profile.is_active)
        toast.success(profile.is_active ? 'User deactivated' : 'User activated')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Failed')
      }
    })
  }

  function handleDelete() {
    setOpen(false)
    if (!confirm(`Delete "${fullName}"? This cannot be undone.`)) return
    startDelete(async () => {
      try {
        await deleteUser(profile.id)
        toast.success('User deleted')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Failed')
      }
    })
  }

  function handleResetPassword() {
    setOpen(false)
    // The password is generated here but deliberately not shown yet: it is
    // only a real credential once Supabase has accepted it. Revealing it at
    // confirmation time meant a failed update still handed the administrator
    // a password to copy, which then could not be used to sign in.
    const newPwd = generatePassword()
    if (!confirm(`Reset the password for "${fullName}"?\n\nA new password will be generated and shown once the change is saved.`)) return
    startReset(async () => {
      try {
        await resetUserPassword(profile.id, newPwd)
        setIssuedPassword(newPwd)
        toast.success('Password reset. User will be prompted to change it on next login.')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        setIssuedPassword(null)
        toast.error(err?.message ?? 'Password reset failed — the password was not changed')
      }
    })
  }

  async function copyIssuedPassword() {
    if (!issuedPassword) return
    try {
      await navigator.clipboard.writeText(issuedPassword)
      toast.success('Password copied')
    } catch {
      toast.error('Could not copy — select the password and copy it manually')
    }
  }

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border bg-surface shadow-xs transition-all',
        profile.is_active
          ? 'border-line hover:-translate-y-px hover:border-line-strong hover:shadow-sm'
          : 'border-line bg-surface-muted',
      )}
    >
      <Toaster position="top-center" />

      <div className="flex items-start gap-3 px-4 py-3.5">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
            profile.is_active ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-4',
          )}
          aria-hidden="true"
        >
          {initials}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('truncate text-[13.5px] font-semibold', profile.is_active ? 'text-ink' : 'text-ink-3')}>
              {fullName}
              {isSelf && <span className="ml-1.5 text-[11px] font-normal text-ink-4">(you)</span>}
            </p>

            {isAdmin && !isSelf && (
              <div className="relative -mt-0.5 -mr-1 shrink-0">
                <button
                  onClick={() => setOpen(v => !v)}
                  aria-label={`Actions for ${fullName}`}
                  aria-expanded={open}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-4 transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {open && (
                  <div className="absolute right-0 top-8 z-20 min-w-44 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-pop">
                    <Link
                      href={`/admin/users/${profile.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-ink-2 hover:bg-surface-muted hover:text-ink"
                      onClick={() => setOpen(false)}
                    >
                      <Edit className="h-3.5 w-3.5 text-ink-4" /> Edit
                    </Link>
                    <button
                      onClick={handleResetPassword}
                      disabled={resetting}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-ink-2 hover:bg-surface-muted hover:text-ink disabled:opacity-50"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-ink-4" /> Reset password
                    </button>
                    {profile.role !== 'admin' && (
                      <button
                        onClick={handleToggle}
                        disabled={toggling}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-ink-2 hover:bg-surface-muted hover:text-ink disabled:opacity-50"
                      >
                        {profile.is_active
                          ? <><UserX className="h-3.5 w-3.5 text-ink-4" /> Deactivate</>
                          : <><UserCheck className="h-3.5 w-3.5 text-ink-4" /> Activate</>}
                      </button>
                    )}
                    <div className="my-1 border-t border-line" />
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-crit-fg hover:bg-crit-bg disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-ink-3">
            <Mail className="h-3 w-3 shrink-0 text-ink-4" />
            <span className="truncate">{profile.email}</span>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Badge tone={ROLE_TONE[profile.role] ?? 'neutral'} dot>
              <span className="capitalize">{profile.role}</span>
            </Badge>
            {!profile.is_active && <Badge tone="neutral">Inactive</Badge>}
          </div>
        </div>
      </div>

      {issuedPassword && (
        <div className="border-t border-ok-line bg-ok-bg px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ok-fg">
            New password — saved
          </p>
          <p className="mt-1.5 break-all rounded-md border border-ok-line bg-surface px-2 py-1.5 font-mono text-[12.5px] text-ink">
            {issuedPassword}
          </p>
          <p className="mt-1.5 text-[11.5px] text-ink-2">
            Copy this — it won&rsquo;t be shown again.
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={copyIssuedPassword} className={buttonClass('secondary', 'sm')}>
              <Copy className="h-3 w-3" /> Copy
            </button>
            <button onClick={() => setIssuedPassword(null)} className={buttonClass('ghost', 'sm')}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {(profile.phone_number || (profile.role === 'client' && profile.company_name) || depts.length > 0 || specialties.length > 0) && (
        <div className="mt-auto space-y-1.5 border-t border-line px-4 py-2.5">
          {profile.role === 'client' && profile.company_name && (
            <p className="truncate text-[12px] font-medium text-ink-2">{profile.company_name}</p>
          )}
          {profile.phone_number && (
            <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <Phone className="h-3 w-3 shrink-0 text-ink-4" /> {profile.phone_number}
            </p>
          )}
          {(depts.length > 0 || specialties.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {depts.map(d => <Badge key={d} tone="brand">{d}</Badge>)}
              {specialties.map(sp => (
                <Badge key={sp} tone="neutral"><span className="capitalize">{sp}</span></Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
