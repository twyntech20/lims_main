-- ============================================================
-- Phase 4: Accountability hardening
-- Run in Supabase SQL Editor. Additive only — safe to run on
-- top of the existing (possibly hand-modified) schema.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Generic audit trigger
-- Schema-agnostic: uses to_jsonb(old)/to_jsonb(new) so it keeps
-- working even if columns are added/changed later without this
-- file being updated.
-- ------------------------------------------------------------
create or replace function log_audit_change()
returns trigger language plpgsql security definer as $$
declare
  v_record_id text;
begin
  v_record_id := coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'));

  insert into audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    v_record_id,
    case when tg_op = 'DELETE' then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_orders       after insert or update or delete on orders       for each row execute function log_audit_change();
create trigger audit_samples      after insert or update or delete on samples      for each row execute function log_audit_change();
create trigger audit_sample_tests after insert or update or delete on sample_tests for each row execute function log_audit_change();
create trigger audit_clients      after insert or update or delete on clients      for each row execute function log_audit_change();
create trigger audit_tests        after insert or update or delete on tests        for each row execute function log_audit_change();
create trigger audit_projects     after insert or update or delete on projects     for each row execute function log_audit_change();
-- profiles: only log updates (role changes, deactivation, etc.) — not every login-driven read
create trigger audit_profiles     after update on profiles for each row execute function log_audit_change();

-- ------------------------------------------------------------
-- 2. Block direct edits to approved results
-- Once a result is approved, corrections must go through the
-- amendments workflow (createAmendment/approveAmendment) so
-- there's a documented reason and a second approval.
-- ------------------------------------------------------------
create or replace function block_approved_result_edits()
returns trigger language plpgsql as $$
begin
  if old.status = 'approved' and (
    new.result is distinct from old.result or
    new.unit is distinct from old.unit or
    new.qualifier is distinct from old.qualifier or
    new.mdl is distinct from old.mdl or
    new.dilution_factor is distinct from old.dilution_factor
  ) then
    raise exception 'Cannot edit an approved result directly — use the amendments workflow';
  end if;
  return new;
end;
$$;

create trigger prevent_approved_result_edits
  before update on sample_tests
  for each row execute function block_approved_result_edits();

-- ------------------------------------------------------------
-- 3. Overdue order alerts
-- Notifies the assigned analyst + all admins/managers once an
-- order passes its due date, at most once every 24h per order.
-- ------------------------------------------------------------
create or replace function check_overdue_orders()
returns void language plpgsql security definer as $$
begin
  insert into notifications (user_id, type, title, message, link)
  select p.id, 'overdue_alert',
    'Order Overdue',
    'Order ' || o.order_number || ' is past its due date (' || to_char(o.date_due, 'YYYY-MM-DD') || ').',
    '/admin/orders/' || o.id
  from orders o
  join profiles p on p.id = o.assigned_analyst_id
  where o.date_due < now()
    and o.status not in ('completed', 'cancelled')
    and not exists (
      select 1 from notifications n
      where n.user_id = p.id and n.type = 'overdue_alert' and n.link = '/admin/orders/' || o.id
        and n.created_at > now() - interval '24 hours'
    );

  insert into notifications (user_id, type, title, message, link)
  select p.id, 'overdue_alert',
    'Order Overdue',
    'Order ' || o.order_number || ' is past its due date.',
    '/admin/orders/' || o.id
  from orders o
  cross join profiles p
  where o.date_due < now()
    and o.status not in ('completed', 'cancelled')
    and p.role in ('admin', 'manager') and p.is_active = true
    and not exists (
      select 1 from notifications n
      where n.user_id = p.id and n.type = 'overdue_alert' and n.link = '/admin/orders/' || o.id
        and n.created_at > now() - interval '24 hours'
    );
end;
$$;
