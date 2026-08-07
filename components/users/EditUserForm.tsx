'use client'

import { useState, useTransition } from 'react'

import { updateUser } from '@/app/actions/users'
import { Loader2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'manager', label: 'Manager', description: 'View-only access across all areas' },
  { value: 'analyst', label: 'Analyst', description: 'Process and enter results' },
  { value: 'client', label: 'Client', description: 'Submit orders, view results' },
]

const SPECIALTIES = ['soil', 'food', 'water', 'legionella']

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  phone_number: string | null
  company_name: string | null
  date_of_hire: string | null
  specialty_chemistry: boolean
  specialty_microbiology: boolean
  specialties_list: string | null
  can_review: boolean
}

export default function EditUserForm({ profile }: { profile: Profile }) {
  const [role, setRole] = useState(profile.role)
  const [phone, setPhone] = useState(profile.phone_number ?? '')
  const [saving, startSave] = useTransition()

  const existingSpecialties = profile.specialties_list ? profile.specialties_list.split(',').filter(Boolean) : []

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startSave(async () => {
      try {
        await updateUser(formData)
        toast.success('User updated')
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Failed to update user')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Toaster position="top-center" />
      <input type="hidden" name="id" value={profile.id} />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Personal Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
            <input
              name="first_name"
              required
              defaultValue={profile.first_name ?? ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
            <input
              name="last_name"
              defaultValue={profile.last_name ?? ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
          <input
            name="phone"
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
            placeholder="(XXX) XXX-XXXX"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <p className="text-sm text-slate-500">{profile.email}</p>
          <p className="text-xs text-slate-400 mt-0.5">Email cannot be changed from this form</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
        <h2 className="font-semibold text-slate-900">Role</h2>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(r => (
            <label
              key={r.value}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                role === r.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">{r.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {role === 'client' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-3">Client Details</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
            <input
              name="company_name"
              defaultValue={profile.company_name ?? ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {role === 'analyst' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">Analyst Details</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Hire</label>
            <input
              type="date"
              name="date_of_hire"
              defaultValue={profile.date_of_hire ?? ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Department</p>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="specialty_chemistry" defaultChecked={profile.specialty_chemistry} className="rounded text-blue-600" />
                <span className="text-sm text-slate-700">Chemistry</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="specialty_microbiology" defaultChecked={profile.specialty_microbiology} className="rounded text-blue-600" />
                <span className="text-sm text-slate-700">Microbiology</span>
              </label>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Specialties</p>
            <div className="flex flex-wrap gap-4">
              {SPECIALTIES.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="specialties"
                    value={s}
                    defaultChecked={existingSpecialties.includes(s)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-slate-700 capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="can_review" defaultChecked={profile.can_review} className="rounded text-blue-600" />
              <div>
                <p className="text-sm font-medium text-slate-700">Can Review Results</p>
                <p className="text-xs text-slate-400">Allows this analyst to approve results entered by others</p>
              </div>
            </label>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/admin/users" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
