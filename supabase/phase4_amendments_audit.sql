-- ============================================================
-- Phase 4c: audit trigger for amendments
-- Separate file in case "amendments" isn't in this environment
-- (run phase4_accountability.sql first — this depends on
-- log_audit_change() defined there).
-- ============================================================

create trigger audit_amendments
  after insert or update or delete on amendments
  for each row execute function log_audit_change();
