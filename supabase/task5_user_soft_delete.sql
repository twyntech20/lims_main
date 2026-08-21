-- ============================================================
-- User soft-delete with a 30-day retention window
--
-- Deleting a user used to call auth.admin.deleteUser, which cascades
-- through profiles.id -> auth.users(id) on delete cascade. That drops the
-- profile row, which in turn nulls every attribution column pointing at it
-- (samples.assigned_analyst_id, sample_tests.entered_by / reviewed_by /
-- approved_by, orders.created_by / released_by, amendments.applied_by) and
-- cascade-deletes the user's notifications. Chain-of-custody attribution on
-- historical laboratory records was destroyed irreversibly.
--
-- The profile row now stays put for 30 days and is only purged afterwards,
-- so results keep resolving the analyst who entered and approved them for
-- the whole retention window.
-- ============================================================

-- 1. Retention marker ----------------------------------------------------
alter table profiles
  add column if not exists deleted_at timestamptz;

comment on column profiles.deleted_at is
  'Soft-delete marker. Non-null means the account is withdrawn from the '
  'active Users list and is awaiting permanent purge 30 days later. '
  'Historical laboratory attribution keeps resolving until then.';

-- Only the purge scan needs an index, and it reads the rare non-null rows.
create index if not exists profiles_deleted_at_idx
  on profiles (deleted_at)
  where deleted_at is not null;

-- 2. The delete itself ---------------------------------------------------
-- One definer function bans the auth account and stamps the profile in a
-- single transaction. The app calls it over the session client: an
-- auth.admin ban needs SUPABASE_SERVICE_ROLE_KEY, which not every
-- deployment carries (the committed .env.local does not), and the admin
-- client constructor throws before anything has been revoked. Authorization
-- is re-checked here because definer rights must never be reachable by a
-- non-admin caller, whatever the app layer does.
create or replace function soft_delete_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null or get_user_role(v_caller) is distinct from 'admin' then
    raise exception 'Only admins can delete users';
  end if;
  if target_id = v_caller then
    raise exception 'Cannot delete your own account';
  end if;

  update profiles
     set deleted_at = now(),
         is_active  = false
   where id = target_id
     and deleted_at is null;
  if not found then
    raise exception 'User not found or already deleted';
  end if;

  -- A concrete far-future timestamp, deliberately not 'infinity': GoTrue
  -- scans banned_until into a Go time value and special values would break
  -- every read of this row. Far longer than the retention window so access
  -- cannot come back if the purge job ever stalls.
  update auth.users
     set banned_until = now() + interval '100 years'
   where id = target_id;
end;
$$;

comment on function soft_delete_user(uuid) is
  'Atomic admin soft-delete: stamps profiles.deleted_at, deactivates, and '
  'bans the auth account in one transaction. Caller must be an admin '
  '(checked via auth.uid()). Purged permanently by purge_deleted_users() '
  'after 30 days.';

revoke all on function soft_delete_user(uuid) from public;
revoke all on function soft_delete_user(uuid) from anon;
grant execute on function soft_delete_user(uuid) to authenticated;

-- 3. Permanent purge -----------------------------------------------------
-- Deleting the auth user is what removes the profile, via the existing
-- on delete cascade. Doing it in this order keeps the two in step and
-- reuses the cascade already defined in schema.sql rather than adding a
-- second deletion path.
create or replace function purge_deleted_users()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purged integer := 0;
begin
  with expired as (
    select id
    from profiles
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
  )
  delete from auth.users u
  using expired e
  where u.id = e.id;

  get diagnostics v_purged = row_count;
  return v_purged;
end;
$$;

comment on function purge_deleted_users() is
  'Permanently removes users soft-deleted more than 30 days ago. Deletes the '
  'auth.users row; profiles follows through on delete cascade.';

-- Definer rights delete auth users, so no client role may call this.
revoke all on function purge_deleted_users() from public;
revoke all on function purge_deleted_users() from anon;
revoke all on function purge_deleted_users() from authenticated;

-- 4. Schedule ------------------------------------------------------------
-- pg_cron is already installed and already runs check_overdue_orders and
-- check_overdue_reviews hourly (see phase4_cron.sql); this follows the same
-- shape. Daily is enough for a 30-day window.
select cron.unschedule('purge-deleted-users')
where exists (select 1 from cron.job where jobname = 'purge-deleted-users');

select cron.schedule(
  'purge-deleted-users',
  '0 3 * * *',   -- daily, 03:00 UTC
  $$select public.purge_deleted_users()$$
);

-- Belt and braces: Supabase's DDL event triggers normally reload the
-- PostgREST schema cache, but rpc('soft_delete_user') depends on it, so
-- reload explicitly in case this file is applied where they are absent.
notify pgrst, 'reload schema';
