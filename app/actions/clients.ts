'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  validateClientId, validateName, validateEmail,
  validateClientPhone, validateZip, validateState,
  assertNoErrors, ValidationError,
} from '@/lib/validation'

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return raw
}

export async function createClientRecord(formData: FormData) {
  const supabase = await createClient()

  const clientId   = (formData.get('client_id')   as string ?? '').trim()
  const clientName = (formData.get('client_name') as string ?? '').trim()
  const email      = (formData.get('email')        as string ?? '').trim() || null
  const phone      = formData.get('phone') ? formatPhone(formData.get('phone') as string) : null
  const address    = (formData.get('address')      as string ?? '').trim() || null
  const city       = (formData.get('city')         as string ?? '').trim() || null
  const state      = (formData.get('state')        as string ?? '').trim() || null
  const zip        = (formData.get('zip')          as string ?? '').trim() || null
  const tags       = formData.getAll('tags').join(',')

  // ── Validation ──────────────────────────────────────────
  const errors: ValidationError = {}
  errors.client_id   = validateClientId(clientId)   ?? ''
  errors.client_name = validateName(clientName, 'Client name', 2) ?? ''
  errors.email       = validateEmail(email) ?? ''
  errors.phone       = validateClientPhone(phone) ?? ''
  errors.zip         = validateZip(zip) ?? ''
  errors.state       = validateState(state) ?? ''
  assertNoErrors(errors)

  // ── Duplicate checks ────────────────────────────────────
  const { data: existingName } = await supabase
    .from('clients').select('id').ilike('client_name', clientName).maybeSingle()
  if (existingName) throw new Error(`Client name "${clientName}" already exists`)

  const { data: existingId } = await supabase
    .from('clients').select('id').eq('client_id', clientId).maybeSingle()
  if (existingId) throw new Error(`Client ID "${clientId}" is already taken`)

  const { data: client, error } = await supabase
    .from('clients')
    .insert({ client_id: clientId, client_name: clientName, email, phone, address, city, state, zip, tags })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/admin/clients')
  redirect(`/admin/clients/${client.id}`)
}

export async function updateClientRecord(formData: FormData) {
  const supabase = await createClient()
  const id         = formData.get('id') as string
  const clientName = (formData.get('client_name') as string ?? '').trim()
  const email      = (formData.get('email')        as string ?? '').trim() || null
  const phone      = formData.get('phone') ? formatPhone(formData.get('phone') as string) : null
  const address    = (formData.get('address')      as string ?? '').trim() || null
  const city       = (formData.get('city')         as string ?? '').trim() || null
  const state      = (formData.get('state')        as string ?? '').trim() || null
  const zip        = (formData.get('zip')          as string ?? '').trim() || null
  const tags       = formData.getAll('tags').join(',')

  const errors: ValidationError = {}
  errors.client_name = validateName(clientName, 'Client name', 2) ?? ''
  errors.email       = validateEmail(email) ?? ''
  errors.phone       = validateClientPhone(phone) ?? ''
  errors.zip         = validateZip(zip) ?? ''
  errors.state       = validateState(state) ?? ''
  assertNoErrors(errors)

  const { data: existing } = await supabase
    .from('clients').select('id').ilike('client_name', clientName).neq('id', id).maybeSingle()
  if (existing) throw new Error(`Client name "${clientName}" already exists`)

  const { error } = await supabase
    .from('clients')
    .update({ client_name: clientName, email, phone, address, city, state, zip, tags })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/clients/${id}`)
  redirect(`/admin/clients/${id}`)
}

export async function deleteClientRecord(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/clients')
  redirect('/admin/clients')
}

export async function importClientsCSV(formData: FormData) {
  const supabase = await createClient()
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')

  const text = await file.text()
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })

  const inserts = rows.map(r => ({
    client_id:   r['client_id'] || null,
    client_name: r['client_name'] || r['name'] || '',
    email:       r['email'] || null,
    phone:       r['phone'] ? formatPhone(r['phone']) : null,
    address:     r['address'] || null,
    city:        r['city'] || null,
    state:       r['state'] || null,
    zip:         r['zip'] || null,
    tags:        r['tags'] || '',
  })).filter(r => r.client_name)

  const { error } = await supabase.from('clients').upsert(inserts, { onConflict: 'client_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/clients')
}
