-- ============================================================
-- Task 3: enterprise workflow control, routing and result integrity.
--
-- Applied to the live LIMS project via the Supabase MCP connector as
-- three migrations (checked in here so the repo stops drifting from the
-- live schema — same reasoning as phase3b/phase3c/phase4/phase5):
--
--   20260817xxxxxx  workflow_notification_types
--   20260817xxxxxx  task3_workflow_columns_and_amendment_rls
--   20260817xxxxxx  task3_result_integrity_and_workflow_notifications
--
-- Everything here is additive. No table is dropped, no status enum value
-- is added to result_status or order_status, and the existing audit and
-- notification systems are extended rather than duplicated.
-- ============================================================


-- ── 1. notification types ───────────────────────────────────
-- Must run in its own transaction: a new enum value cannot be used by
-- statements in the transaction that added it.

alter type notification_type add value if not exists 'review_assigned';
alter type notification_type add value if not exists 'result_returned';
alter type notification_type add value if not exists 'result_approved';
alter type notification_type add value if not exists 'result_released';
alter type notification_type add value if not exists 'review_overdue';


-- ── 2. workflow columns + amendment RLS ─────────────────────

-- Return-for-changes facts on the existing result row. Status stays
-- 'entered' when a result is returned, so every existing query keeps
-- working; "returned for changes" is derived from
-- (status = 'entered' AND returned_at IS NOT NULL).
alter table sample_tests add column if not exists returned_at       timestamptz;
alter table sample_tests add column if not exists returned_by       uuid references profiles(id);
alter table sample_tests add column if not exists rejection_reason  text;
alter table sample_tests add column if not exists review_round      integer not null default 1;

create index if not exists idx_sample_tests_assigned_reviewer on sample_tests(assigned_reviewer_id) where assigned_reviewer_id is not null;
create index if not exists idx_sample_tests_status            on sample_tests(status);

-- Controlled release: who released the results to the client, and when.
-- date_completed already existed but records no actor.
alter table orders add column if not exists released_by uuid references profiles(id);
alter table orders add column if not exists released_at timestamptz;

-- Amendments can target one result and carry the before/after values, so
-- previous value, new value, actor, timestamp, reason, reviewer and
-- approver are all preserved on the amendment row.
alter table amendments add column if not exists sample_test_id uuid references sample_tests(id);
alter table amendments add column if not exists previous_value jsonb;
alter table amendments add column if not exists new_value      jsonb;
alter table amendments add column if not exists review_comment text;
alter table amendments add column if not exists applied_at     timestamptz;
alter table amendments add column if not exists applied_by     uuid references profiles(id);

create index if not exists idx_amendments_sample_test on amendments(sample_test_id) where sample_test_id is not null;
create index if not exists idx_amendments_status      on amendments(status);

-- amendments had RLS enabled with ZERO policies, so every read and write
-- was denied and the whole amendments feature was dead in the app.
-- Mirror the policy shape already used for samples/sample_tests.
drop policy if exists staff_amendments_all     on amendments;
drop policy if exists client_amendments_select on amendments;

create policy "staff_amendments_all" on amendments for all using (
  get_user_role(auth.uid()) in ('admin', 'manager', 'analyst')
);

create policy "client_amendments_select" on amendments for select using (
  order_id in (
    select o.id from orders o join clients c on c.id = o.client_id
    where c.client_name = (select company_name from profiles where id = auth.uid())
  )
);


-- ── 3. result integrity + workflow routing ──────────────────

-- Extends the EXISTING block_approved_result_edits() trigger (same
-- trigger, same name — not a second one):
--   a) approved values stay immutable (unchanged behaviour)
--   b) results on a RELEASED order are immutable regardless of status
--   c) the amendments workflow gets one sanctioned write path, opened
--      only by apply_amendment() via a transaction-local GUC
create or replace function public.block_approved_result_edits()
returns trigger
language plpgsql
as $function$
declare
  v_released_at timestamptz;
  v_values_changed boolean;
begin
  v_values_changed :=
    new.result          is distinct from old.result or
    new.unit            is distinct from old.unit or
    new.qualifier       is distinct from old.qualifier or
    new.mdl             is distinct from old.mdl or
    new.dilution_factor is distinct from old.dilution_factor;

  if not v_values_changed then
    return new;
  end if;

  if coalesce(current_setting('lims.applying_amendment', true), '') = 'on' then
    return new;
  end if;

  select o.released_at into v_released_at
  from samples s join orders o on o.id = s.order_id
  where s.id = old.sample_id;

  if v_released_at is not null then
    raise exception 'This result belongs to a released report — use the amendments workflow';
  end if;

  if old.status = 'approved' then
    raise exception 'Cannot edit an approved result directly — use the amendments workflow';
  end if;

  return new;
end;
$function$;


-- Controlled application of an approved amendment to a result.
create or replace function public.apply_amendment(p_amendment_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  a           amendments%rowtype;
  st          sample_tests%rowtype;
  v_order_id  uuid;
  v_actor     uuid := auth.uid();
begin
  select * into a from amendments where id = p_amendment_id;
  if not found then raise exception 'Amendment not found'; end if;
  if a.status <> 'approved' then raise exception 'Only an approved amendment can be applied'; end if;
  if a.applied_at is not null then raise exception 'This amendment has already been applied'; end if;
  if a.sample_test_id is null then raise exception 'This amendment is not linked to a specific result'; end if;
  if a.new_value is null then raise exception 'This amendment carries no new value to apply'; end if;

  select * into st from sample_tests where id = a.sample_test_id;
  if not found then raise exception 'Amended result no longer exists'; end if;

  select s.order_id into v_order_id from samples s where s.id = st.sample_id;

  update amendments
     set previous_value = jsonb_build_object(
           'result',          st.result,
           'unit',            st.unit,
           'qualifier',       st.qualifier,
           'mdl',             st.mdl,
           'dilution_factor', st.dilution_factor,
           'status',          st.status::text,
           'approved_by',     st.approved_by,
           'approved_at',     st.approved_at
         ),
         applied_at = now(),
         applied_by = v_actor
   where id = p_amendment_id;

  perform set_config('lims.applying_amendment', 'on', true);

  update sample_tests
     set result           = coalesce(a.new_value->>'result',    result),
         unit             = coalesce(a.new_value->>'unit',      unit),
         qualifier        = nullif(coalesce(a.new_value->>'qualifier', coalesce(qualifier, '')), ''),
         mdl              = coalesce(a.new_value->>'mdl',       mdl),
         dilution_factor  = coalesce((a.new_value->>'dilution_factor')::numeric, dilution_factor),
         -- An amended result is not an approved result: it re-enters review.
         status               = 'entered',
         approved_by          = null,
         approved_at          = null,
         reviewed_by          = null,
         reviewed_at          = null,
         assigned_reviewer_id = null,
         review_round         = review_round + 1
   where id = a.sample_test_id;

  perform set_config('lims.applying_amendment', 'off', true);

  -- A released report that gets amended must be released again.
  if v_order_id is not null then
    update orders
       set status         = 'review',
           released_by    = null,
           released_at    = null,
           date_completed = null
     where id = v_order_id and released_at is not null;
  end if;

  insert into audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  values (v_actor, 'amendment_applied', 'sample_tests', a.sample_test_id::text,
          (select previous_value from amendments where id = p_amendment_id),
          a.new_value);
end;
$function$;


-- Result-level routing notifications, on the EXISTING notifications
-- table and in the same shape as notify_on_order_status_change.
create or replace function public.notify_on_result_workflow()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order    orders%rowtype;
  v_sample   samples%rowtype;
  v_test     text;
  v_label    text;
begin
  select * into v_sample from samples where id = new.sample_id;
  if not found then return new; end if;
  select * into v_order from orders where id = v_sample.order_id;
  select name into v_test from tests where id = new.test_id;
  v_label := coalesce(v_order.order_number, '') || ' · ' || coalesce(v_sample.sample_id, '') || ' · ' || coalesce(v_test, 'test');

  if new.assigned_reviewer_id is not null
     and new.assigned_reviewer_id is distinct from old.assigned_reviewer_id then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (new.assigned_reviewer_id, 'review_assigned',
            'Result assigned to you for review',
            v_label || ' is waiting for your review.',
            '/analyst/review-queue',
            jsonb_build_object('sample_test_id', new.id, 'order_id', v_order.id));
  end if;

  if new.returned_at is distinct from old.returned_at
     and new.returned_at is not null
     and new.entered_by is not null then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (new.entered_by, 'result_returned',
            'Result returned for changes',
            v_label || ' was returned: ' || coalesce(new.rejection_reason, 'no reason given'),
            '/analyst/work-queue?status=entered',
            jsonb_build_object('sample_test_id', new.id, 'order_id', v_order.id));
  end if;

  if new.status = 'approved' and old.status is distinct from 'approved'
     and new.entered_by is not null
     and new.entered_by is distinct from new.approved_by then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (new.entered_by, 'result_approved',
            'Result approved',
            v_label || ' has been approved.',
            '/analyst/work-queue?status=approved',
            jsonb_build_object('sample_test_id', new.id, 'order_id', v_order.id));
  end if;

  return new;
end;
$function$;

drop trigger if exists on_result_workflow_changed on sample_tests;
create trigger on_result_workflow_changed
  after update on sample_tests
  for each row execute function notify_on_result_workflow();


-- Overdue reviews — sibling of the existing check_overdue_orders().
create or replace function public.check_overdue_reviews()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into notifications (user_id, type, title, message, link, metadata)
  select st.assigned_reviewer_id, 'review_overdue',
         'Review overdue',
         'Review of ' || coalesce(o.order_number, '') || ' · ' || coalesce(s.sample_id, '') ||
         ' is past the order due date.',
         '/analyst/review-queue',
         jsonb_build_object('sample_test_id', st.id, 'order_id', o.id)
  from sample_tests st
  join samples s on s.id = st.sample_id
  join orders  o on o.id = s.order_id
  where st.status = 'reviewed'
    and st.assigned_reviewer_id is not null
    and o.date_due is not null
    and o.date_due < now()
    and o.status not in ('completed', 'cancelled')
    and not exists (
      select 1 from notifications n
      where n.user_id = st.assigned_reviewer_id
        and n.type = 'review_overdue'
        and n.metadata->>'sample_test_id' = st.id::text
        and n.created_at > now() - interval '24 hours'
    );
end;
$function$;


-- ── 4. schedule ─────────────────────────────────────────────
-- Added alongside the existing hourly check-overdue-orders job rather
-- than introducing a second scheduling mechanism.

select cron.schedule(
  'check-overdue-reviews',
  '0 * * * *',   -- hourly
  $$select public.check_overdue_reviews()$$
);
