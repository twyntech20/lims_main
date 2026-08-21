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

-- 2. Permanent purge -----------------------------------------------------
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

-- 3. Schedule ------------------------------------------------------------
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
