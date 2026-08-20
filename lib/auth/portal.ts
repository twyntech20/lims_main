/* ============================================================
   Staff / client portal separation.

   One source of truth for "which portal does this role belong to, and
   may it be here", so the middleware, the layouts and the denial page
   cannot drift apart.

   The application has two portals, not two route prefixes:

     staff  -> /admin/*   (admin, manager)
               /analyst/* (analyst)
     client -> /client/*  (client)

   There is no /staff/* route; the staff portal is the admin and analyst
   trees. Roles come from the existing user_role enum — nothing here adds,
   renames or infers a role.
   ============================================================ */

export type Portal = 'staff' | 'client'

/** Roles that belong to the staff portal. Mirrors the existing enum. */
export const STAFF_ROLES = ['admin', 'manager', 'analyst'] as const

export function isStaffRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'manager' || role === 'analyst'
}

/** The portal a role belongs to. Anything unrecognised is treated as a client. */
export function portalForRole(role: string | null | undefined): Portal {
  return isStaffRole(role) ? 'staff' : 'client'
}

/** Where a role lands when it reaches the right portal. */
export function portalHome(role: string | null | undefined): string {
  switch (role) {
    case 'admin':
    case 'manager':  return '/admin/dashboard'
    case 'analyst':  return '/analyst/dashboard'
    default:         return '/client/dashboard'
  }
}

/**
 * Which portal a path belongs to, or null when it belongs to neither.
 *
 * Matched on a segment boundary on purpose: /client-login is a public login
 * page, not part of the client portal, and must not be classified as one.
 */
export function portalOfPath(pathname: string): Portal | null {
  const inTree = (base: string) => pathname === base || pathname.startsWith(`${base}/`)
  if (inTree('/admin') || inTree('/analyst')) return 'staff'
  if (inTree('/client')) return 'client'
  return null
}

/** Whether a role may enter a portal. */
export function isRoleAllowedOnPortal(role: string | null | undefined, portal: Portal): boolean {
  return portalForRole(role) === portal
}

/**
 * The access decision for one request. `deniedPortal` is the portal that
 * refused them, which is what the denial page explains.
 */
export function portalAccess(
  role: string | null | undefined,
  pathname: string,
): { allowed: true } | { allowed: false; deniedPortal: Portal } {
  const portal = portalOfPath(pathname)
  if (!portal) return { allowed: true }
  if (isRoleAllowedOnPortal(role, portal)) return { allowed: true }
  return { allowed: false, deniedPortal: portal }
}

/** Where an unauthorised cross-portal attempt is sent. */
export const ACCESS_DENIED_PATH = '/access-denied'

/**
 * Copy for the denial page, keyed by the portal that refused access.
 * A role only ever sees the message for the portal it does not belong to,
 * so the two cases are exhaustive.
 */
export const DENIAL_COPY: Record<Portal, { title: string; body: string; cta: string }> = {
  // A client reached the staff portal.
  staff: {
    title: 'Accès réservé au personnel.',
    body:  'Veuillez utiliser le portail client.',
    cta:   'Aller au portail client →',
  },
  // Staff, an admin or an analyst reached the client portal.
  client: {
    title: 'Accès réservé aux clients.',
    body:  'Veuillez utiliser le portail staff.',
    cta:   'Aller au portail staff →',
  },
}
