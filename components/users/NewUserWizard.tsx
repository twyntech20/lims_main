'use client'

import { useState, useTransition } from 'react'

import { createUser } from '@/app/actions/users'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, RefreshCw, Check, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'manager', label: 'Manager', description: 'View-only access across all areas' },
  { value: 'analyst', label: 'Analyst', description: 'Process and enter results' },
  { value: 'client', label: 'Client', description: 'Submit orders, view results' },
]

const SPECIALTIES = ['soil', 'food', 'water', 'legionella']

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghjkmnpqrstuvwxyz'
const DIGITS = '23456789'
const SPECIAL = '!@#$%^&*'

function generatePassword(): string {
  const all = UPPER + LOWER + DIGITS + SPECIAL
  let pwd = UPPER[Math.floor(Math.random() * UPPER.length)]
    + LOWER[Math.floor(Math.random() * LOWER.length)]
    + DIGITS[Math.floor(Math.random() * DIGITS.length)]
    + SPECIAL[Math.floor(Math.random() * SPECIAL.length)]
  for (let i = 4; i < 14; i++) pwd += all[Math.floor(Math.random() * all.length)]
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

interface StrengthCheck { label: string; ok: boolean }

function getChecks(pwd: string): StrengthCheck[] {
  return [
    { label: 'At least 12 characters', ok: pwd.length >= 12 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(pwd) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(pwd) },
    { label: 'Number', ok: /[0-9]/.test(pwd) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(pwd) },
  ]
}

interface Client { id: string; client_name: string }

export default function NewUserWizard({ clients }: { clients: Client[] }) {
  const [step, setStep] = useState(1)
  const [showPwd, setShowPwd] = useState(false)
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('analyst')
  const [pending, startTransition] = useTransition()

  // Step 1 fields (kept in state for FormData)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const checks = getChecks(password)
  const passwordStrong = checks.every(c => c.ok)
  const strengthScore = checks.filter(c => c.ok).length

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!passwordStrong) {
      toast.error('Password does not meet requirements')
      return
    }
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createUser(formData)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Failed to create user')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Toaster position="top-center" />

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}>{s}</div>
            <span className={`text-sm font-medium ${step >= s ? 'text-slate-900' : 'text-slate-400'}`}>
              {s === 1 ? 'Credentials' : 'Role & Details'}
            </span>
            {s < 2 && <div className="w-12 h-px bg-slate-200 mx-1" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Account Credentials</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Min 12 chars, mixed case, number, symbol"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPassword(generatePassword())}
                    className="p-1.5 text-slate-400 hover:text-slate-600 transition"
                    title="Generate password"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Strength bar */}
              {password && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                        i < strengthScore
                          ? strengthScore <= 2 ? 'bg-red-400' : strengthScore <= 3 ? 'bg-yellow-400' : 'bg-green-400'
                          : 'bg-slate-100'
                      }`} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {checks.map(c => (
                      <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-green-600' : 'text-slate-400'}`}>
                        {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                <input
                  name="first_name"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
                <input
                  name="last_name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
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
          </div>

          <div className="flex gap-3 justify-end">
            <Link href="/admin/users" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => {
                if (!email || !password || !firstName) {
                  toast.error('Email, password, and first name are required')
                  return
                }
                if (!passwordStrong) {
                  toast.error('Password does not meet requirements')
                  return
                }
                setStep(2)
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm"
            >
              Next: Role & Details →
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          {/* Hidden fields from step 1 */}
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="password" value={password} />
          <input type="hidden" name="first_name" value={firstName} />
          <input type="hidden" name="last_name" value={lastName} />
          <input type="hidden" name="phone" value={phone} />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
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

          {/* Client-specific */}
          {role === 'client' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">Client Details</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Company <span className="text-red-500">*</span>
                </label>
                <select
                  name="company_name"
                  required={role === 'client'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a client…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.client_name}>{c.client_name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  This links the user to an existing client account.
                </p>
              </div>
            </div>
          )}

          {/* Analyst-specific */}
          {role === 'analyst' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <h2 className="font-semibold text-slate-900">Analyst Details</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Hire</label>
                <input
                  type="date"
                  name="date_of_hire"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Department</p>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="specialty_chemistry" className="rounded text-blue-600" />
                    <span className="text-sm text-slate-700">Chemistry</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="specialty_microbiology" className="rounded text-blue-600" />
                    <span className="text-sm text-slate-700">Microbiology</span>
                  </label>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Specialties</p>
                <div className="flex flex-wrap gap-4">
                  {SPECIALTIES.map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="specialties" value={s} className="rounded text-blue-600" />
                      <span className="text-sm text-slate-700 capitalize">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="can_review" className="rounded text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Can Review Results</p>
                    <p className="text-xs text-slate-400">Allows this analyst to approve results entered by others</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-between pb-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-semibold px-8 py-2.5 rounded-xl transition shadow-sm text-sm"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              {pending ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}
