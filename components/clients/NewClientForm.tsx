'use client'

import { useState, useTransition } from 'react'
import { createClientRecord } from '@/app/actions/clients'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { PATTERNS, US_STATES } from '@/lib/validation'
import AddressAutocomplete, { ADDRESS_AUTOCOMPLETE_ENABLED } from '@/components/ui/AddressAutocomplete'

const US_STATE_LIST = Array.from(US_STATES).sort()
const TAGS = ['soil', 'food', 'water', 'chemistry', 'microbiology', 'legionella']

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

function formatZipInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

interface FieldErrors {
  client_id?: string; client_name?: string; email?: string
  phone?: string; zip?: string
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-red-500 mt-1">{msg}</p>
}

export default function NewClientForm() {
  const [phone, setPhone] = useState('')
  const [zip,     setZip]     = useState('')
  const [address, setAddress] = useState('')
  const [city,    setCity]    = useState('')
  const [state,   setState]   = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pending, startTransition] = useTransition()

  function validate(fd: FormData): FieldErrors {
    const errs: FieldErrors = {}
    const clientId   = (fd.get('client_id')   as string ?? '').trim()
    const clientName = (fd.get('client_name') as string ?? '').trim()
    const email      = (fd.get('email')        as string ?? '').trim()
    const ph         = (fd.get('phone')        as string ?? '').trim()
    const z          = (fd.get('zip')          as string ?? '').trim()

    if (!clientId)             errs.client_id   = 'Client ID is required'
    else if (!PATTERNS.clientId.test(clientId)) errs.client_id = 'Client ID must be 2–20 chars, letters/numbers/hyphens only'
    if (!clientName || clientName.length < 2)   errs.client_name = 'Client name must be at least 2 characters'
    if (email && !PATTERNS.email.test(email))   errs.email = 'Invalid email address'
    if (ph && !PATTERNS.phoneClient.test(ph))   errs.phone = 'Phone must be XXX-XXX-XXXX'
    if (z  && !PATTERNS.zip.test(z))            errs.zip   = 'ZIP must be XXXXX or XXXXX-XXXX'
    return errs
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const errs = validate(formData)
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return

    startTransition(async () => {
      try {
        await createClientRecord(formData)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Failed to create client')
      }
    })
  }

  const inputCls = (err?: string) =>
    `w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${err ? 'border-red-400 focus:ring-red-400' : 'border-slate-200'}`

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Toaster position="top-center" />

      {/* Identification */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Identification</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Client ID <span className="text-red-500">*</span>
            </label>
            <input name="client_id" required placeholder="e.g. C001"
              className={inputCls(errors.client_id)} />
            {errors.client_id
              ? <FieldError msg={errors.client_id} />
              : <p className="text-xs text-slate-400 mt-1">Unique identifier for this client</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input name="client_name" required placeholder="Company or organization name"
              className={inputCls(errors.client_name)} />
            <FieldError msg={errors.client_name} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input type="email" name="email" placeholder="client@example.com"
            className={inputCls(errors.email)} />
          <FieldError msg={errors.email} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
          <input name="phone" value={phone} onChange={e => setPhone(formatPhoneInput(e.target.value))}
            placeholder="XXX-XXX-XXXX" className={inputCls(errors.phone)} />
          <FieldError msg={errors.phone} />
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Address</h2>
        {ADDRESS_AUTOCOMPLETE_ENABLED && (
          <p className="-mt-2 text-[12px] text-ink-4">Start typing and select from the suggestions to auto-fill</p>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Street Address</label>
          <AddressAutocomplete
            defaultValue={address}
            placeholder="123 Main St"
            onAddressSelect={f => {
              setAddress(f.address)
              setCity(f.city)
              setState(f.state)
              setZip(f.zip)
            }}
          />
          {/* Hidden input so FormData includes the value */}
          <input type="hidden" name="address" value={address} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
            <input name="city" value={city} onChange={e => setCity(e.target.value)} placeholder="City"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
            <select name="state" value={state} onChange={e => setState(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">—</option>
              {US_STATE_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ZIP</label>
            <input name="zip" value={zip} onChange={e => setZip(formatZipInput(e.target.value))}
              placeholder="XXXXX" className={inputCls(errors.zip)} />
            <FieldError msg={errors.zip} />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-2">Tags</h2>
        <p className="text-xs text-slate-400 mb-3">Select the analysis areas this client sends samples for</p>
        <div className="flex flex-wrap gap-3">
          {TAGS.map(tag => (
            <label key={tag} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="tags" value={tag} className="rounded text-blue-600" />
              <span className="text-sm text-slate-700 capitalize">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/admin/clients" className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">
          Cancel
        </Link>
        <button type="submit" disabled={pending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm">
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          {pending ? 'Creating…' : 'Create Client'}
        </button>
      </div>
    </form>
  )
}
