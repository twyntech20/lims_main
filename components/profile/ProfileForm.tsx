'use client'

import { useState, useTransition } from 'react'
import { updateProfile, changePassword } from '@/app/actions/profile'

interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  phone_number: string | null
}

interface Props { profile: Profile }

const INPUT_CLS =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL_CLS = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function ProfileForm({ profile }: Props) {
  const [profilePending, startProfileTransition] = useTransition()
  const [passwordPending, startPasswordTransition] = useTransition()
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileMsg(null)
    const formData = new FormData(e.currentTarget)
    startProfileTransition(async () => {
      try {
        await updateProfile(formData)
        setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
      } catch (err: any) {
        setProfileMsg({ type: 'error', text: err?.message ?? 'Failed to update profile.' })
      }
    })
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordMsg(null)
    const formData = new FormData(e.currentTarget)
    startPasswordTransition(async () => {
      try {
        await changePassword(formData)
        setPasswordMsg({ type: 'success', text: 'Password changed successfully.' })
        ;(e.target as HTMLFormElement).reset()
      } catch (err: any) {
        setPasswordMsg({ type: 'error', text: err?.message ?? 'Failed to change password.' })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Personal Information</h2>

        <div className="mb-2">
          <p className="text-sm text-slate-500">Email</p>
          <p className="text-sm font-medium text-slate-900">{profile.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>First Name</label>
            <input
              name="first_name"
              defaultValue={profile.first_name ?? ''}
              className={INPUT_CLS}
              placeholder="First name"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Last Name</label>
            <input
              name="last_name"
              defaultValue={profile.last_name ?? ''}
              className={INPUT_CLS}
              placeholder="Last name"
            />
          </div>
        </div>

        <div>
          <label className={LABEL_CLS}>Phone Number</label>
          <input
            type="tel"
            name="phone_number"
            defaultValue={profile.phone_number ?? ''}
            className={INPUT_CLS}
            placeholder="XXX-XXX-XXXX"
          />
        </div>

        {profileMsg && (
          <p className={`text-sm px-3 py-2 rounded-xl ${
            profileMsg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {profileMsg.text}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={profilePending}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm text-sm"
          >
            {profilePending ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Change Password</h2>

        <div>
          <label className={LABEL_CLS}>New Password</label>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            className={INPUT_CLS}
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label className={LABEL_CLS}>Confirm New Password</label>
          <input
            type="password"
            name="confirm_password"
            autoComplete="new-password"
            minLength={8}
            required
            className={INPUT_CLS}
            placeholder="Repeat password"
          />
        </div>

        {passwordMsg && (
          <p className={`text-sm px-3 py-2 rounded-xl ${
            passwordMsg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {passwordMsg.text}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={passwordPending}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm text-sm"
          >
            {passwordPending ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  )
}
