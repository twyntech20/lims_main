-- ============================================================
-- Phase 3 Migration: Fix schema to match original Django models
-- Run this in Supabase SQL Editor BEFORE the Phase 3 code
-- Safe to run — all tables are still empty
-- ============================================================

-- Drop existing trigger on auth.users first
drop trigger if exists on_auth_user_created on auth.users;

-- Drop existing tables in correct order (respect FK dependencies)
drop table if exists audit_logs cascade;
drop table if exists notifications cascade;
drop table if exists results cascade;
drop table if exists sample_tests cascade;
drop table if exists samples cascade;
drop table if exists tests cascade;
drop table if exists orders cascade;
drop table if exists projects cascade;
drop table if exists clients cascade;
drop table if exists profiles cascade;

-- Drop sequence if exists
drop sequence if exists order_number_seq;

-- Drop existing types (recreate fresh)
drop type if exists notification_type cascade;
drop type if exists result_status cascade;
drop type if exists sample_status cascade;
drop type if exists order_priority cascade;
drop type if exists order_status cascade;
drop type if exists user_role cascade;

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('admin', 'manager', 'analyst', 'client');
create type order_status as enum ('new', 'submitted', 'in_progress', 'review', 'completed', 'cancelled');
create type order_priority as enum ('normal', 'same_day', 'priority_24h', 'priority_48h');
create type sample_status as enum ('pending', 'in_progress', 'completed', 'cancelled');
create type result_status as enum ('pending', 'entered', 'reviewed', 'approved');
create type notification_type as enum (
  'order_submitted', 'order_assigned', 'order_completed',
  'result_entered', 'amendment_requested', 'overdue_alert', 'general'
);

-- ============================================================
-- PROFILES
-- Matches Django User model: first_name, last_name separate,
-- analyst specialties, can_review, date_of_hire, force_password_change
-- ============================================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  first_name text,
  last_name text,
  role user_role not null default 'client',
  -- CLIENT-specific
  company_name text,
  -- ANALYST-specific
  date_of_hire date,
  specialty_chemistry boolean not null default false,
  specialty_microbiology boolean not null default false,
  specialties_list text default '',        -- comma-separated: soil,food,water,chemistry,microbiology,legionella
  can_review boolean not null default false,
  -- Common
  phone_number text,                        -- format: (XXX) XXX-XXXX
  is_active boolean not null default true,
  force_password_change boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helper: get full name
create or replace function profile_full_name(p profiles)
returns text language sql stable as $$
  select trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
$$;

-- Auto-create profile on auth.users insert
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, first_name, role, force_password_change)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client'),
    coalesce((new.raw_user_meta_data->>'force_password_change')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- CLIENTS
-- Matches Django Client model exactly:
-- client_id (user-defined unique), client_name, tags (comma-sep),
-- phone XXX-XXX-XXXX, zip XXXXX or XXXXX-XXXX, state 2-char
-- NO is_active, NO profile FK (clients ≠ portal users in original)
-- ============================================================
create table clients (
  id uuid primary key default gen_random_uuid(),
  client_id text unique,                   -- user-defined e.g. "C001"
  client_name text not null,
  email text,
  phone text,                              -- format: XXX-XXX-XXXX
  address text,
  city text,
  state varchar(2),                        -- 2-char US state code
  zip text,                               -- XXXXX or XXXXX-XXXX
  tags text not null default '',           -- comma-sep: soil,food,water,chemistry,microbiology,legionella
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROJECTS
-- Matches Django Project model:
-- project_no, project_code, project_name, project_man (text, NOT FK),
-- date_receive + time_receive, date_complete + time_complete
-- Standalone — NOT linked to clients
-- ============================================================
create table projects (
  id uuid primary key default gen_random_uuid(),
  project_no text not null default '',
  project_code text,
  project_name text not null default '',
  project_man text not null default '',    -- free text, project manager name
  date_receive date not null default current_date,
  time_receive time not null default '00:00',
  date_complete date,
  time_complete time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ORDERS
-- ============================================================
create sequence order_number_seq start 1000;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('ORD-' || nextval('order_number_seq')::text),
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  status order_status not null default 'new',
  priority order_priority not null default 'normal',
  customer_name text,
  customer_email text,
  customer_phone text,
  shipping_address text,
  notes text,
  date_received timestamptz,
  date_due timestamptz,
  date_assigned timestamptz,
  date_completed timestamptz,
  assigned_analyst_id uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SAMPLES
-- ============================================================
create table samples (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sample_id text not null,
  description text,
  matrix_type text,
  collection_date timestamptz,
  collection_location text,
  status sample_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, sample_id)
);

-- ============================================================
-- TESTS (Analysis Catalog)
-- ============================================================
create table tests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  category text,                           -- 'chemistry' or 'microbiology'
  method text,
  unit text,
  turnaround_days integer default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SAMPLE TESTS
-- ============================================================
create table sample_tests (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid not null references samples(id) on delete cascade,
  test_id uuid not null references tests(id) on delete restrict,
  status result_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique(sample_id, test_id)
);

-- ============================================================
-- RESULTS
-- ============================================================
create table results (
  id uuid primary key default gen_random_uuid(),
  sample_test_id uuid not null references sample_tests(id) on delete cascade unique,
  value text,
  unit text,
  status result_status not null default 'pending',
  notes text,
  entered_by uuid references profiles(id) on delete set null,
  reviewed_by uuid references profiles(id) on delete set null,
  entered_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null default 'general',
  title text not null,
  message text not null,
  is_read boolean not null default false,
  link text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text not null,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_profiles_updated_at   before update on profiles   for each row execute function set_updated_at();
create trigger set_clients_updated_at    before update on clients    for each row execute function set_updated_at();
create trigger set_projects_updated_at   before update on projects   for each row execute function set_updated_at();
create trigger set_orders_updated_at     before update on orders     for each row execute function set_updated_at();
create trigger set_samples_updated_at    before update on samples    for each row execute function set_updated_at();
create trigger set_tests_updated_at      before update on tests      for each row execute function set_updated_at();
create trigger set_results_updated_at    before update on results    for each row execute function set_updated_at();

-- ============================================================
-- AUTO-NOTIFY on order status change
-- ============================================================
create or replace function notify_on_order_status_change()
returns trigger language plpgsql security definer as $$
begin
  if old.status = new.status then return new; end if;

  -- Notify admins/managers when client submits order
  if new.status = 'submitted' then
    insert into notifications (user_id, type, title, message, link)
    select id, 'order_submitted',
      'New Order Submitted',
      'Order ' || new.order_number || ' has been submitted and requires review.',
      '/admin/orders/' || new.id
    from profiles
    where role in ('admin', 'manager') and is_active = true;
  end if;

  -- Notify analyst when assigned
  if new.status = 'in_progress' and new.assigned_analyst_id is not null and
     (old.assigned_analyst_id is null or old.assigned_analyst_id != new.assigned_analyst_id) then
    insert into notifications (user_id, type, title, message, link)
    values (
      new.assigned_analyst_id, 'order_assigned',
      'Order Assigned to You',
      'Order ' || new.order_number || ' has been assigned to you.',
      '/analyst/work-queue'
    );
  end if;

  -- Notify client on completion
  if new.status = 'completed' then
    insert into notifications (user_id, type, title, message, link)
    select p.id, 'order_completed',
      'Your Order is Complete',
      'Order ' || new.order_number || ' results are now available.',
      '/client/orders/' || new.id
    from profiles p
    where p.role = 'client' and p.company_name = (
      select client_name from clients where id = new.client_id
    );
  end if;

  return new;
end;
$$;

create trigger on_order_status_changed
  after update of status on orders
  for each row execute function notify_on_order_status_change();

-- ============================================================
-- AUTO-MOVE ORDER TO REVIEW when all samples completed
-- ============================================================
create or replace function check_order_completion()
returns trigger language plpgsql security definer as $$
declare
  v_order_id uuid;
  v_total integer;
  v_completed integer;
begin
  v_order_id := new.order_id;
  select count(*) into v_total from samples where order_id = v_order_id;
  select count(*) into v_completed from samples where order_id = v_order_id and status = 'completed';
  if v_total > 0 and v_total = v_completed then
    update orders set status = 'review', updated_at = now()
    where id = v_order_id and status = 'in_progress';
  end if;
  return new;
end;
$$;

create trigger on_sample_completed
  after update of status on samples
  for each row when (new.status = 'completed')
  execute function check_order_completion();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles     enable row level security;
alter table clients      enable row level security;
alter table projects     enable row level security;
alter table orders       enable row level security;
alter table samples      enable row level security;
alter table tests        enable row level security;
alter table sample_tests enable row level security;
alter table results      enable row level security;
alter table notifications enable row level security;
alter table audit_logs   enable row level security;

-- Helper
create or replace function get_user_role(user_id uuid)
returns user_role language sql security definer stable as $$
  select role from profiles where id = user_id;
$$;

-- PROFILES
create policy "own_profile_select"    on profiles for select using (auth.uid() = id);
create policy "staff_profiles_select" on profiles for select using (get_user_role(auth.uid()) in ('admin', 'manager'));
create policy "own_profile_update"    on profiles for update using (auth.uid() = id);
create policy "admin_profiles_update" on profiles for update using (get_user_role(auth.uid()) in ('admin', 'manager'));
create policy "admin_profiles_insert" on profiles for insert with check (get_user_role(auth.uid()) in ('admin', 'manager'));

-- CLIENTS — all staff can view; only admin/manager can modify
create policy "staff_clients_select"  on clients for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "admin_clients_all"     on clients for all using (get_user_role(auth.uid()) in ('admin', 'manager'));

-- PROJECTS — all staff can view; only admin/manager can modify
create policy "staff_projects_select" on projects for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "admin_projects_all"    on projects for all using (get_user_role(auth.uid()) in ('admin', 'manager'));

-- ORDERS
create policy "staff_orders_select"   on orders for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "client_orders_select"  on orders for select using (
  client_id in (select id from clients where client_name = (select company_name from profiles where id = auth.uid()))
);
create policy "admin_orders_all"      on orders for all using (get_user_role(auth.uid()) in ('admin', 'manager'));
create policy "analyst_orders_update" on orders for update using (
  get_user_role(auth.uid()) = 'analyst' and assigned_analyst_id = auth.uid()
);

-- SAMPLES
create policy "staff_samples_select"  on samples for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "staff_samples_all"     on samples for all using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));

-- TESTS
create policy "auth_tests_select"     on tests for select using (auth.uid() is not null);
create policy "admin_tests_all"       on tests for all using (get_user_role(auth.uid()) in ('admin', 'manager'));

-- SAMPLE_TESTS
create policy "staff_st_select"       on sample_tests for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "staff_st_all"          on sample_tests for all using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));

-- RESULTS
create policy "staff_results_select"  on results for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "staff_results_all"     on results for all using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));

-- NOTIFICATIONS
create policy "own_notifications"     on notifications for select using (user_id = auth.uid());
create policy "mark_notifications"    on notifications for update using (user_id = auth.uid());
create policy "system_notifications"  on notifications for insert with check (true);

-- AUDIT LOGS
create policy "admin_audit_select"    on audit_logs for select using (get_user_role(auth.uid()) in ('admin', 'manager'));
create policy "system_audit_insert"   on audit_logs for insert with check (true);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_clients_client_id      on clients(client_id);
create index idx_clients_client_name    on clients(client_name);
create index idx_orders_client_id       on orders(client_id);
create index idx_orders_status          on orders(status);
create index idx_orders_analyst         on orders(assigned_analyst_id);
create index idx_samples_order_id       on samples(order_id);
create index idx_notifications_user     on notifications(user_id);
create index idx_notifications_unread   on notifications(user_id, is_read);
create index idx_audit_table_record     on audit_logs(table_name, record_id);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table orders;
