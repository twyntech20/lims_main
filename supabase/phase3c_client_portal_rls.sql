-- ============================================================
-- Phase 3c: client-portal RLS policies
-- Applied directly to the live "LIMS" project via Supabase MCP on
-- 2026-08-11. migration_phase3_fix.sql's RLS section never granted
-- the 'client' role any access beyond reading their own orders —
-- clients could not find their own client record, submit an order,
-- or add samples/tests to it.
-- ============================================================

-- Let a client find their own "clients" record
create policy "client_own_client_select" on clients for select using (
  get_user_role(auth.uid()) = 'client'
  and client_name = (select company_name from profiles where id = auth.uid())
);

-- Let a client submit their own order
create policy "client_orders_insert" on orders for insert with check (
  get_user_role(auth.uid()) = 'client'
  and client_id in (
    select id from clients where client_name = (select company_name from profiles where id = auth.uid())
  )
);

-- Let a client create/view samples on their own orders
create policy "client_samples_insert" on samples for insert with check (
  order_id in (
    select o.id from orders o join clients c on c.id = o.client_id
    where c.client_name = (select company_name from profiles where id = auth.uid())
  )
);
create policy "client_samples_select" on samples for select using (
  order_id in (
    select o.id from orders o join clients c on c.id = o.client_id
    where c.client_name = (select company_name from profiles where id = auth.uid())
  )
);

-- Same for sample_tests (also carries the client-visible result columns
-- added in phase3b_sample_tests_result_columns.sql)
create policy "client_sample_tests_insert" on sample_tests for insert with check (
  sample_id in (
    select s.id from samples s join orders o on o.id = s.order_id join clients c on c.id = o.client_id
    where c.client_name = (select company_name from profiles where id = auth.uid())
  )
);
create policy "client_sample_tests_select" on sample_tests for select using (
  sample_id in (
    select s.id from samples s join orders o on o.id = s.order_id join clients c on c.id = o.client_id
    where c.client_name = (select company_name from profiles where id = auth.uid())
  )
);

-- Projects aren't linked to clients in this schema, so any
-- authenticated user (including clients) can list them.
create policy "auth_projects_select" on projects for select using (auth.uid() is not null);
