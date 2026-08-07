'use client'

import { useState, useTransition } from 'react'
import { updateClientRecord, deleteClientRecord } from '@/app/actions/clients'

import { Loader2, Trash2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { PATTERNS, US_STATES } from '@/lib/validation'
import AddressAutocomplete from '@/components/ui/AddressAutocomplete'

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

interface FieldErrors { client_name?: string; email?: string; phone?: string; zip?: string }
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-red-500 mt-1">{msg}</p>
}

interface Client {
  id: string; client_id: string | null; client_name: string
  email: string | null; phone: string | null; address: string | null
  city: string | null; state: string | null; zip: string | null; tags: string | null
}

export default function EditClientForm({ client }: { client: Client }) {
  const existingTags = client.tags ? client.tags.split(',').filter(Boolean) : []
  const [phone,   setPhone]   = useState(client.phone   ?? '')
  const [zip,     setZip]     = useState(client.zip     ?? '')
  const [address, setAddress] = useState(client.address ?? '')
  const [city,    setCity]    = useState(client.city    ?? '')
  const [state,   setState]   = useState(client.state   ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving,   startSave]   = useTransition()
  const [deleting, startDelete] = useTransition()

  function validate(fd: FormData): FieldErrors {
    const errs: FieldErrors = {}
    const name  = (fd.get('client_name') as string ?? '').trim()
    const email = (fd.get('email')        as string ?? '').trim()
    const ph    = (fd.get('phone')        as string ?? '').trim()
    const z     = (fd.get('zip')          as string ?? '').trim()

    if (!name || name.length < 2)             errs.client_name = 'Client name must be at least 2 characters'
    if (email && !PATTERNS.email.test(email)) errs.email = 'Invalid email address'
    if (ph    && !PATTERNS.phoneClient.test(ph)) errs.phone = 'Phone must be XXX-XXX-XXXX'
    if (z     && !PATTERNS.zip.test(z))          errs.zip   = 'ZIP must be XXXXX or XXXXX-XXXX'
    return errs
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const errs = validate(formData)
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return

    startSave(async () => {
      try {
        await updateClientRecord(formData)
      } catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Update failed')
      }
    })
  }

  function handleDelete() {
    if (!confirm(`Delete "${client.client_name}"? This cannot be undone.`)) return
    startDelete(async () => {
      try { await deleteClientRecord(client.id) }
      catch (err: any) {
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        toast.error(err.message ?? 'Delete failed')
      }
    })
  }

  const inputCls = (err?: string) =>
    `w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${err ? 'border-red-400 focus:ring-red-400' : 'border-slate-200'}`

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Toaster position="top-center" />
      <input type="hidden" name="id" value={client.id} />

      {/* Identification */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Identification</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Client ID</label>
            <input value={client.client_id ?? ''} readOnly
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
            <p className="text-xs text-slate-400 mt-1">Cannot be changed after creation</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input name="client_name" required defaultValue={client.client_name}
              className={inputCls(errors.client_name)} />
            <FieldError msg={errors.client_name} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input type="email" name="email" defaultValue={client.email ?? ''}
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
        <p className="text-xs text-slate-400 -mt-2">Start typing and select from the suggestions to auto-fill</p>
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
        <input type="hidden" name="address" value={address} />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <input name="city" value={city} onChange={e => setCity(e.target.value)} placeholder="City"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <select name="state" value={state} onChange={e => setState(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">—</option>
              {US_STATE_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <input name="zip" value={zip} onChange={e => setZip(formatZipInput(e.target.value))}
              placeholder="XXXXX" className={inputCls(errors.zip)} />
            <FieldError msg={errors.zip} />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-3">Tags</h2>
        <div className="flex flex-wrap gap-3">
          {TAGS.map(tag => (
            <label key={tag} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="tags" value={tag}
                defaultChecked={existingTags.includes(tag)} className="rounded text-blue-600" />
              <span className="text-sm text-slate-700 capitalize">{tag}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pb-6">
        <button type="button" onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-medium transition disabled:opacity-50">
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting…' : 'Delete Client'}
        </button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm text-sm">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
