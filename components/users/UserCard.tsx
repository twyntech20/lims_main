'use client'

import { useState, useTransition } from 'react'

import Link from 'next/link'
import { toggleUserActive, deleteUser, resetUserPassword } from '@/app/actions/users'
import { USER_RETENTION_DAYS } from '@/lib/user-retention'
import { MoreVertical, KeyRound, Trash2, UserCheck, UserX, Edit, Mail, Phone, Copy, Eye, EyeOff } from 'lucide-react'
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

/* Uniform random integer in [0, max). Rejection sampling keeps every value
   equally likely: taking a raw 32-bit draw modulo `max` would favour the
   low end whenever max does not divide 2^32. */
function randomIndex(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max
  const buf = new Uint32Array(1)
  let draw = 0
  do {
    crypto.getRandomValues(buf)
    draw = buf[0]
  } while (draw >= limit)
  return draw % max
}

function pick(chars: string): string {
  return chars[randomIndex(chars.length)]
}

/* Fourteen characters with at least one of each class, which satisfies the
   twelve-character policy validatePassword() enforces server-side. The
   alphabets deliberately omit I/O/l/0/1 so the password can be read aloud
   or transcribed without ambiguity. */
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$%^&*'
  const all = upper + lower + digits + special

  const chars = [pick(upper), pick(lower), pick(digits), pick(special)]
  for (let i = 4; i < 14; i++) chars.push(pick(all))

  // Fisher-Yates: the guaranteed characters must not stay in positions 0-3,
  // and an unbiased shuffle is the only way to place them uniformly.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export default function UserCard({ profile, isAdmin, isSelf }: Props) {
  const [open, setOpen] = useState(false)
  const [toggling, startToggle] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [resetting, startReset] = useTransition()
  /* Holds the issued password only once Supabase has confirmed the change.
     Null at every other moment, so a failed reset cannot reveal anything. */
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null)
  const [passwordVisible, setPasswordVisible] = useState(false)
  /* Delete asks in the page rather than through window.confirm(): a browser
     that has suppressed native dialogs returns false from confirm() with no
     dialog and no error, which silently swallowed the whole action. */
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  /* Reset asks in the page for the same reason Delete does: a browser that
     has suppressed native dialogs returns false from confirm() with no
     dialog and no error, which silently swallowed the whole action. */
  const [confirmingReset, setConfirmingReset] = useState(false)

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

  // Opens the confirmation panel only. Nothing is deleted until the admin
  // presses Delete inside it.
  function handleDelete() {
    setOpen(false)
    setConfirmingDelete(true)
  }

  function confirmDelete() {
    if (deleting) return
    startDelete(async () => {
      try {
        await deleteUser(profile.id)
        // revalidatePath in the action drops this card from the list; the
        // panel is closed anyway so a failed revalidation cannot strand it.
        setConfirmingDelete(false)
        toast.success(`User deleted. Retained for ${USER_RETENTION_DAYS} days before permanent removal.`)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        // Leave the panel open so the admin can retry or cancel, and say
        // nothing that implies the account was removed.
        toast.error(err.message ?? 'Failed')
      }
    })
  }

  // Opens the confirmation panel only. No password is generated and nothing
  // is sent to Supabase until the admin presses Reset password inside it.
  function handleResetPassword() {
    setOpen(false)
    setConfirmingReset(true)
  }

  function confirmResetPassword() {
    if (resetting) return

    /* One password, generated once. This exact value is what the server
       action sends to Supabase and, on success, what the panel below
       displays — the two can never diverge. */
    const newPwd = generatePassword()

    startReset(async () => {
      try {
        await resetUserPassword(profile.id, newPwd)
        // Reached only when the password and the force_password_change flag
        // were both written; the action throws on either failure.
        setConfirmingReset(false)
        setPasswordVisible(false)
        setIssuedPassword(newPwd)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        // Leave the panel open so the admin can retry or cancel, and reveal
        // nothing: the old password is still the live one.
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
      // Clipboard access is refused outside a secure context; showing the
      // password lets the administrator select it by hand instead.
      setPasswordVisible(true)
      toast.error('Could not copy — reveal the password and copy it manually')
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

      {confirmingDelete && (
        <div
          role="alertdialog"
          aria-modal="false"
          aria-labelledby={`delete-title-${profile.id}`}
          aria-describedby={`delete-desc-${profile.id}`}
          className="border-t border-crit-line bg-crit-bg px-4 py-3"
        >
          <p
            id={`delete-title-${profile.id}`}
            className="text-[11px] font-semibold uppercase tracking-[0.06em] text-crit-fg"
          >
            Delete this user?
          </p>
          <p id={`delete-desc-${profile.id}`} className="mt-1.5 text-[11.5px] text-ink-2">
            <span className="font-medium text-ink">{fullName}</span> will be removed from the
            active Users list and will no longer be able to sign in. The account is retained
            for {USER_RETENTION_DAYS} days — laboratory records keep showing this person as the
            analyst or reviewer — and is then permanently deleted.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              autoFocus
              className={buttonClass('danger', 'sm')}
            >
              <Trash2 className="h-3 w-3" /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className={buttonClass('secondary', 'sm')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmingReset && (
        <div
          role="alertdialog"
          aria-modal="false"
          aria-labelledby={`reset-title-${profile.id}`}
          aria-describedby={`reset-desc-${profile.id}`}
          className="border-t border-line bg-surface-muted px-4 py-3"
        >
          <p
            id={`reset-title-${profile.id}`}
            className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2"
          >
            Reset this password?
          </p>
          <p id={`reset-desc-${profile.id}`} className="mt-1.5 text-[11.5px] text-ink-2">
            A new temporary password will be generated for{' '}
            <span className="font-medium text-ink">{fullName}</span> and shown here once
            Supabase has saved it. Their current password stops working immediately, and they
            will be asked to choose a new one at their next sign-in.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirmResetPassword}
              disabled={resetting}
              autoFocus
              className={buttonClass('primary', 'sm')}
            >
              <KeyRound className="h-3 w-3" /> {resetting ? 'Resetting…' : 'Reset password'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              disabled={resetting}
              className={buttonClass('secondary', 'sm')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {issuedPassword && (
        <div className="border-t border-ok-line bg-ok-bg px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ok-fg">
            Password reset successfully
          </p>

          <div className="mt-1.5 flex items-stretch gap-1.5">
            <p
              className="min-w-0 flex-1 truncate rounded-md border border-ok-line bg-surface px-2 py-1.5 font-mono text-[12.5px] text-ink"
              title={passwordVisible ? issuedPassword : undefined}
            >
              {passwordVisible ? issuedPassword : '•'.repeat(issuedPassword.length)}
            </p>
            <button
              type="button"
              onClick={() => setPasswordVisible(v => !v)}
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              className={buttonClass('secondary', 'sm', 'shrink-0')}
            >
              {passwordVisible
                ? <><EyeOff className="h-3 w-3" /> Hide</>
                : <><Eye className="h-3 w-3" /> Show</>}
            </button>
          </div>

          <p className="mt-1.5 text-[11.5px] text-ink-2">
            Use this password to test this account. The user will be required to
            change it after login.
          </p>

          <div className="mt-2 flex gap-2">
            <button type="button" onClick={copyIssuedPassword} className={buttonClass('secondary', 'sm')}>
              <Copy className="h-3 w-3" /> Copy
            </button>
            <button
              type="button"
              onClick={() => { setIssuedPassword(null); setPasswordVisible(false) }}
              className={buttonClass('ghost', 'sm')}
            >
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
