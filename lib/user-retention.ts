/* How long a deleted user is kept before permanent removal.
   purge_deleted_users() in supabase/task5_user_soft_delete.sql hard-codes the
   same window on the database side; change both together. Lives outside
   app/actions/users.ts because a 'use server' module may only export async
   functions, and both the server action and the Users UI need this value. */
export const USER_RETENTION_DAYS = 30
