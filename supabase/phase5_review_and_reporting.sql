-- ============================================================
-- Phase 5: Review-queue access, reporting fields
-- Applied directly to the live LIMS project via the Supabase MCP
-- connector. Checked in here so the repo stops drifting from the
-- live schema (same reasoning as phase3b/phase3c/phase4).
-- ============================================================

-- Analysts previously had no RLS path to read any profile but their
-- own, so the work queue / review queue silently rendered a blank
-- "entered by" / "reviewed by" name for any analyst-role viewer.
-- Broaden the existing staff read policy to include 'analyst', matching
-- the pattern already used for clients/projects/orders/samples.
drop policy if exists staff_profiles_select on profiles;
create policy "staff_profiles_select" on profiles for select using (
  get_user_role(auth.uid()) in ('admin', 'manager', 'analyst')
);

-- Certificate-of-Analysis reports need a "reference range" field per
-- test, but nothing in the schema had a home for it. Additive and
-- nullable — populated by the Excel test-catalog import (Phase 6).
alter table tests add column if not exists reference_range text;
