'use client'

import { useState, useTransition } from 'react'

import Link from 'next/link'
import { toggleUserActive, deleteUser, resetUserPassword } from '@/app/actions/users'
import { MoreVertical, KeyRound, Trash2, UserCheck, UserX, Edit } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

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
  roleColors: Record<string, string>
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

export default function UserCard({ profile, isAdmin, isSelf, roleColors }: Props) {
  const [open, setOpen] = useState(false)
  const [toggling, startToggle] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [resetting, startReset] = useTransition()

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
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
    const newPwd = generatePassword()
    if (!confirm(`Reset password for "${fullName}"?\n\nNew password: ${newPwd}\n\nCopy this — it won't be shown again.`)) return
    startReset(async () => {
      try {
        await resetUserPassword(profile.id, newPwd)
        toast.success('Password reset. User will be prompted to change on next login.')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Failed')
      }
    })
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 relative transition ${!profile.is_active ? 'opacity-60 border-slate-100' : 'border-slate-200'}`}>
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 truncate">{fullName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[profile.role] ?? 'bg-slate-100 text-slate-600'}`}>
              {profile.role}
            </span>
            {!profile.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium">inactive</span>
            )}
          </div>
          <p className="text-sm text-slate-400 truncate mt-0.5">{profile.email}</p>
        </div>

        {isAdmin && !isSelf && (
          <div className="relative ml-2">
            <button
              onClick={() => setOpen(v => !v)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {open && (
              <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 min-w-40 py-1">
                <Link
                  href={`/admin/users/${profile.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Link>
                <button
                  onClick={handleResetPassword}
                  disabled={resetting}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Reset Password
                </button>
                {profile.role !== 'admin' && (
                  <button
                    onClick={handleToggle}
                    disabled={toggling}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left disabled:opacity-50"
                  >
                    {profile.is_active
                      ? <><UserX className="w-3.5 h-3.5" /> Deactivate</>
                      : <><UserCheck className="w-3.5 h-3.5" /> Activate</>
                    }
                  </button>
                )}
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 w-full text-left disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1 text-sm">
        {profile.phone_number && (
          <p className="text-slate-500">{profile.phone_number}</p>
        )}
        {profile.role === 'client' && profile.company_name && (
          <p className="text-slate-600 font-medium">{profile.company_name}</p>
        )}
        {profile.role === 'analyst' && depts.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {depts.map(d => (
              <span key={d} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{d}</span>
            ))}
            {specialties.map(s => (
              <span key={s} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
