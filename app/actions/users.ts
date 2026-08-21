'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  validateRequiredEmail, validateName, validateUserPhone,
  validateRole, assertNoErrors, ValidationError,
} from '@/lib/validation'
import { USER_RETENTION_DAYS } from '@/lib/user-retention'

function validatePassword(password: string): string | null {
  if (password.length < 12)          return 'Password must be at least 12 characters'
  if (!/[A-Z]/.test(password))       return 'Password must contain an uppercase letter'
  if (!/[a-z]/.test(password))       return 'Password must contain a lowercase letter'
  if (!/[0-9]/.test(password))       return 'Password must contain a number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a special character'
  return null
}

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>, uid: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', uid).single()
  if (data?.role !== 'admin') throw new Error('Only admins can perform this action')
}

export async function createUser(formData: FormData) {
  const supabase      = await createClient()
  const adminSupabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await assertAdmin(supabase, user.id)

  const email             = (formData.get('email')          as string ?? '').trim()
  const password          = (formData.get('password')       as string ?? '')
  const firstName         = (formData.get('first_name')     as string ?? '').trim()
  const lastName          = (formData.get('last_name')      as string ?? '').trim()
  const phone             = (formData.get('phone')          as string ?? '').trim() || null
  const role              = (formData.get('role')           as string ?? '').trim()
  const companyName       = (formData.get('company_name')   as string ?? '').trim() || null
  const dateOfHire        = (formData.get('date_of_hire')   as string ?? '').trim() || null
  const specialtyChemistry    = formData.get('specialty_chemistry')    === 'on'
  const specialtyMicrobiology = formData.get('specialty_microbiology') === 'on'
  const specialtiesList       = formData.getAll('specialties').join(',')
  const canReview             = formData.get('can_review') === 'on'

  const errors: ValidationError = {}
  errors.email      = validateRequiredEmail(email) ?? ''
  errors.password   = validatePassword(password) ?? ''
  errors.first_name = validateName(firstName, 'First name', 2) ?? ''
  errors.phone      = validateUserPhone(phone) ?? ''
  errors.role       = validateRole(role) ?? ''
  if (role === 'client' && !companyName?.trim()) errors.company_name = 'Company name is required for client users'
  assertNoErrors(errors)

  const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, role, force_password_change: true },
  })
  if (authError) throw new Error(authError.message)

  const { error: profileError } = await adminSupabase
    .from('profiles')
    .update({
      last_name:              lastName || null,
      phone_number:           phone,
      company_name:           companyName,
      date_of_hire:           dateOfHire,
      specialty_chemistry:    specialtyChemistry,
      specialty_microbiology: specialtyMicrobiology,
      specialties_list:       specialtiesList,
      can_review:             canReview,
      force_password_change:  true,
    })
    .eq('id', authUser.user.id)

  if (profileError) throw new Error(profileError.message)

  revalidatePath('/admin/users')
  redirect('/admin/users')
}

export async function updateUser(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await assertAdmin(supabase, user.id)

  const targetId          = formData.get('id') as string
  const firstName         = (formData.get('first_name')     as string ?? '').trim()
  const lastName          = (formData.get('last_name')      as string ?? '').trim()
  const phone             = (formData.get('phone')          as string ?? '').trim() || null
  const role              = (formData.get('role')           as string ?? '').trim()
  const companyName       = (formData.get('company_name')   as string ?? '').trim() || null
  const dateOfHire        = (formData.get('date_of_hire')   as string ?? '').trim() || null
  const specialtyChemistry    = formData.get('specialty_chemistry')    === 'on'
  const specialtyMicrobiology = formData.get('specialty_microbiology') === 'on'
  const specialtiesList       = formData.getAll('specialties').join(',')
  const canReview             = formData.get('can_review') === 'on'

  const errors: ValidationError = {}
  errors.first_name = validateName(firstName, 'First name', 2) ?? ''
  errors.phone      = validateUserPhone(phone) ?? ''
  errors.role       = validateRole(role) ?? ''
  if (role === 'client' && !companyName?.trim()) errors.company_name = 'Company name is required for client users'
  assertNoErrors(errors)

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name:             firstName,
      last_name:              lastName || null,
      phone_number:           phone,
      role:                   role as any,
      company_name:           companyName,
      date_of_hire:           dateOfHire,
      specialty_chemistry:    specialtyChemistry,
      specialty_microbiology: specialtyMicrobiology,
      specialties_list:       specialtiesList,
      can_review:             canReview,
    })
    .eq('id', targetId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
  redirect('/admin/users')
}

export async function toggleUserActive(targetId: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await assertAdmin(supabase, user.id)

  const { data: target } = await supabase.from('profiles').select('role').eq('id', targetId).single()
  if (target?.role === 'admin') throw new Error('Cannot deactivate admin users')

  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', targetId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}

export async function resetUserPassword(targetId: string, newPassword: string) {
  const supabase      = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await assertAdmin(supabase, user.id)

  const pwdError = validatePassword(newPassword)
  if (pwdError) throw new Error(pwdError)

  const { error } = await adminSupabase.auth.admin.updateUserById(targetId, { password: newPassword })
  if (error) throw new Error(error.message)

  /* The password is live from here on. If the flag cannot be raised the reset
     is still incomplete — the user would skip the forced change — so this
     throws rather than reporting a success the caller would act on by
     revealing the password. */
  const { data: flagged, error: flagError } = await supabase
    .from('profiles')
    .update({ force_password_change: true })
    .eq('id', targetId)
    .select('id')
  if (flagError) {
    throw new Error(
      `Password was updated but the forced-change flag could not be set: ${flagError.message}`
    )
  }
  // A row-level policy that filters the row out reports no error, just an
  // empty result, so the flag has to be confirmed by what came back.
  if (!flagged?.length) {
    throw new Error('Password was updated but the forced-change flag could not be set')
  }

  revalidatePath('/admin/users')
}

/* Withdraws a user from the active list without destroying anything.
   A hard delete cascades from auth.users through profiles and nulls every
   attribution column on historical laboratory records, so the row stays and
   is only purged after the retention window. */
export async function deleteUser(targetId: string) {
  const supabase      = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await assertAdmin(supabase, user.id)

  if (targetId === user.id) throw new Error('Cannot delete your own account')

  /* Revoke access first. Nothing in the app blocks an inactive user from
     signing in, so leaving the account usable for the retention window
     would hand a deleted user continued access. Banning is
     reversible — lifting it takes ban_duration: 'none' — and it leaves the
     account and its data intact for the retention period. */
  const { error: banError } = await adminSupabase.auth.admin.updateUserById(targetId, {
    // Deliberately far longer than the retention window. Matching the two
    // would let the ban lapse and hand access back if the purge job ever
    // stopped running.
    ban_duration: '876000h',
  })
  if (banError) throw new Error(banError.message)

  const { data: marked, error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', targetId)
    .is('deleted_at', null)
    .select('id')
  if (error) throw new Error(error.message)
  // Access is already revoked at this point, so a failure here is safe but
  // leaves the user listed. Saying so is better than reporting a deletion
  // that did not happen; running Delete again completes it.
  if (!marked?.length) {
    throw new Error(
      'Access was revoked but the account could not be marked as deleted. It is still listed — try Delete again.'
    )
  }

  revalidatePath('/admin/users')
}
