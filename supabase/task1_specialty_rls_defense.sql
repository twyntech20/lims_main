-- ============================================================
-- Task 1 — laboratory specialty defense-in-depth
--
-- app/actions/results.ts already refuses a cross-specialty result, but that
-- gate lives in the server action. RLS does not encode specialty: the
-- staff_st_all policy is
--
--   ALL / PERMISSIVE, USING (get_user_role(auth.uid())
--                            = ANY (ARRAY['admin','manager','analyst']))
--   WITH CHECK: (null -> Postgres reuses USING for INSERT and UPDATE)
--
-- so any account whose role is 'analyst' may write any sample_tests row.
-- A raw PostgREST call with an analyst's JWT therefore bypasses the action
-- layer entirely. Verified by execution: a chemistry-only analyst wrote a
-- microbiology result, and a microbiology-only analyst wrote a chemistry
-- result, both succeeding at the database layer.
--
-- This adds a BEFORE INSERT OR UPDATE trigger, mirroring the existing
-- prevent_approved_result_edits / block_approved_result_edits pattern rather
-- than altering any policy. staff_st_all is left exactly as it is, RLS stays
-- enabled, and no role or permission changes.
-- ============================================================

-- The same rule as isQualifiedForCategory() in lib/workflow.ts, including its
-- three exemptions, so the two layers cannot disagree.
create or replace function public.is_qualified_for_category(
  p_user uuid,
  p_category text
) returns boolean
language plpgsql
stable
as $$
declare
  v_role       user_role;
  v_chemistry  boolean;
  v_micro      boolean;
begin
  if p_user is null then
    return false;
  end if;

  -- A category outside the two known departments has nothing to match on.
  if p_category is null or p_category not in ('chemistry', 'microbiology') then
    return true;
  end if;

  select role, coalesce(specialty_chemistry, false), coalesce(specialty_microbiology, false)
    into v_role, v_chemistry, v_micro
  from profiles
  where id = p_user;

  if not found then
    return false;
  end if;

  -- Staff override, consistent with isStaffAdmin() in the action layer.
  if v_role in ('admin', 'manager') then
    return true;
  end if;

  -- Neither flag set means unconfigured, not unqualified. Gating these would
  -- strand accounts that predate specialty being recorded.
  if not v_chemistry and not v_micro then
    return true;
  end if;

  return case p_category
           when 'chemistry'    then v_chemistry
           else                     v_micro
         end;
end;
$$;

create or replace function public.enforce_result_specialty()
returns trigger
language plpgsql
as $$
declare
  v_category text;
  v_actor    uuid;
begin
  -- Sanctioned amendment path, matching block_approved_result_edits().
  if coalesce(current_setting('lims.applying_amendment', true), '') = 'on' then
    return new;
  end if;

  select t.category into v_category from tests t where t.id = new.test_id;

  -- Whoever is recording the measurement must be qualified for it.
  --
  -- The actor is the analyst stamped on the row, falling back to the caller's
  -- JWT. When both are absent there is no actor to judge: that is a scheduling
  -- insert (order creation adds sample_tests with no result and no
  -- entered_by) or a privileged server-side context with no JWT. Those are
  -- allowed — judging a null actor would block order creation outright.
  v_actor := coalesce(new.entered_by, auth.uid());

  if v_actor is not null
     and (tg_op = 'INSERT' or new.entered_by is distinct from old.entered_by
          or new.result          is distinct from old.result
          or new.unit            is distinct from old.unit
          or new.qualifier       is distinct from old.qualifier
          or new.mdl             is distinct from old.mdl
          or new.dilution_factor is distinct from old.dilution_factor)
     and not public.is_qualified_for_category(v_actor, v_category)
  then
    raise exception
      'Not qualified for % work — this result belongs to a department outside the assigned specialty',
      v_category;
  end if;

  -- So must the reviewer it is routed to.
  if new.assigned_reviewer_id is not null
     and (tg_op = 'INSERT' or new.assigned_reviewer_id is distinct from old.assigned_reviewer_id)
     and not public.is_qualified_for_category(new.assigned_reviewer_id, v_category)
  then
    raise exception
      'Selected reviewer is not qualified for % work', v_category;
  end if;

  -- And so must whoever signs it off.
  if new.approved_by is not null
     and (tg_op = 'INSERT' or new.approved_by is distinct from old.approved_by)
     and not public.is_qualified_for_category(new.approved_by, v_category)
  then
    raise exception
      'Approver is not qualified for % work', v_category;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_specialty_on_results on public.sample_tests;
create trigger enforce_specialty_on_results
  before insert or update on public.sample_tests
  for each row execute function public.enforce_result_specialty();
