// ============================================================
// Shared validation helpers — used by server actions & forms
// ============================================================

export type ValidationError = Record<string, string>

// ── Regex patterns ──────────────────────────────────────────
export const PATTERNS = {
  email:     /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phoneClient: /^\d{3}-\d{3}-\d{4}$/,          // XXX-XXX-XXXX  (clients)
  phoneUser:   /^\(\d{3}\) \d{3}-\d{4}$/,       // (XXX) XXX-XXXX (profiles)
  zip:         /^\d{5}(-\d{4})?$/,
  clientId:    /^[A-Za-z0-9\-_]{2,20}$/,
}

export const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
])

export const ORDER_PRIORITIES  = new Set(['normal','same_day','priority_24h','priority_48h'])
export const MATRIX_TYPES      = new Set(['drinking_water','wastewater','groundwater','surface_water','soil','sediment','food','air','other'])
export const VALID_ROLES       = new Set(['admin','manager','analyst','client'])

// ── Field validators ────────────────────────────────────────

export function validateEmail(value: string | null | undefined): string | null {
  if (!value?.trim()) return null           // optional field — skip if empty
  return PATTERNS.email.test(value.trim()) ? null : 'Invalid email address'
}

export function validateRequiredEmail(value: string | null | undefined): string | null {
  if (!value?.trim()) return 'Email is required'
  return PATTERNS.email.test(value.trim()) ? null : 'Invalid email address'
}

export function validateClientPhone(value: string | null | undefined): string | null {
  if (!value?.trim()) return null           // optional
  return PATTERNS.phoneClient.test(value.trim())
    ? null
    : 'Phone must be in XXX-XXX-XXXX format'
}

export function validateUserPhone(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  return PATTERNS.phoneUser.test(value.trim())
    ? null
    : 'Phone must be in (XXX) XXX-XXXX format'
}

export function validateZip(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  return PATTERNS.zip.test(value.trim())
    ? null
    : 'ZIP must be 5 digits (XXXXX) or ZIP+4 (XXXXX-XXXX)'
}

export function validateClientId(value: string | null | undefined): string | null {
  if (!value?.trim()) return 'Client ID is required'
  return PATTERNS.clientId.test(value.trim())
    ? null
    : 'Client ID must be 2–20 characters, letters/numbers/hyphens only'
}

export function validateName(value: string | null | undefined, field = 'Name', min = 2): string | null {
  if (!value?.trim()) return `${field} is required`
  return value.trim().length >= min
    ? null
    : `${field} must be at least ${min} characters`
}

export function validateState(value: string | null | undefined): string | null {
  if (!value?.trim()) return null           // optional
  return US_STATES.has(value.trim().toUpperCase()) ? null : 'Invalid US state code'
}

export function validatePriority(value: string | null | undefined): string | null {
  if (!value?.trim()) return 'Priority is required'
  return ORDER_PRIORITIES.has(value) ? null : 'Invalid priority value'
}

export function validateMatrixType(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  return MATRIX_TYPES.has(value) ? null : 'Invalid matrix type'
}

export function validateRole(value: string | null | undefined): string | null {
  if (!value?.trim()) return 'Role is required'
  return VALID_ROLES.has(value) ? null : 'Invalid role'
}

export function validateDateOrder(
  received: string | null | undefined,
  due: string | null | undefined
): string | null {
  if (!received || !due) return null
  return new Date(due) >= new Date(received)
    ? null
    : 'Due date must be on or after the received date'
}

// ── Collect errors helper ───────────────────────────────────
// Throws a single Error with all messages joined if any exist
export function assertNoErrors(errors: ValidationError): void {
  const messages = Object.values(errors).filter(Boolean)
  if (messages.length > 0) throw new Error(messages.join(' · '))
}
