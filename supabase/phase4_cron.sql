-- ============================================================
-- Phase 4b: schedule the overdue-order check
-- Run this AFTER phase4_accountability.sql, as a separate step —
-- pg_cron may need to be enabled from Database → Extensions in
-- the dashboard UI first if this errors with "extension pg_cron
-- is not available".
-- ============================================================

create extension if not exists pg_cron;

select cron.schedule(
  'check-overdue-orders',
  '0 * * * *',   -- hourly
  $$select check_overdue_orders()$$
);
