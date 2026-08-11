-- ============================================================
-- Phase 3b: result-entry columns on sample_tests
-- Applied directly to the live "LIMS" project via Supabase MCP on
-- 2026-08-11. Checked in here so the repo stops drifting from the
-- live schema — migration_phase3_fix.sql alone does NOT include
-- these columns, but every results-entry screen in the app
-- (analyst work queue, review queue, admin work queue, worksheets,
-- reports, order detail, COC) depends on them existing directly on
-- sample_tests.
-- ============================================================

alter table sample_tests
  add column result text,
  add column unit text,
  add column qualifier text,
  add column mdl text,
  add column dilution_factor numeric,
  add column analyst_notes text,
  add column entered_by uuid references profiles(id) on delete set null,
  add column entered_at timestamptz,
  add column reviewed_by uuid references profiles(id) on delete set null,
  add column reviewed_at timestamptz,
  add column approved_by uuid references profiles(id) on delete set null,
  add column approved_at timestamptz;

create index idx_sample_tests_entered_by on sample_tests(entered_by);
create index idx_sample_tests_status on sample_tests(status);
