-- ============================================================
-- LIMS Database Schema for Supabase
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ENUMS
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
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  full_name text,
  role user_role not null default 'client',
  company_name text,
  phone_number text,
  is_active boolean not null default true,
  force_password_change boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- CLIENTS
-- ============================================================
create table clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  company_name text not null,
  contact_name text,
  email text not null,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROJECTS
-- ============================================================
create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
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
  category text,
  method text,
  unit text,
  turnaround_days integer default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SAMPLE TESTS (join: which tests are requested for which sample)
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
-- UPDATED_AT TRIGGER HELPER
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger set_clients_updated_at before update on clients for each row execute function set_updated_at();
create trigger set_projects_updated_at before update on projects for each row execute function set_updated_at();
create trigger set_orders_updated_at before update on orders for each row execute function set_updated_at();
create trigger set_samples_updated_at before update on samples for each row execute function set_updated_at();
create trigger set_tests_updated_at before update on tests for each row execute function set_updated_at();
create trigger set_results_updated_at before update on results for each row execute function set_updated_at();

-- ============================================================
-- AUTO-NOTIFY on order status change
-- ============================================================
create or replace function notify_on_order_status_change()
returns trigger language plpgsql security definer as $$
declare
  v_client_profile_id uuid;
  v_order_number text;
begin
  if old.status = new.status then return new; end if;

  select order_number into v_order_number from orders where id = new.id;

  -- Notify admins/managers on new submission
  if new.status = 'submitted' then
    insert into notifications (user_id, type, title, message, link)
    select id, 'order_submitted',
      'New Order Submitted',
      'Order ' || new.order_number || ' has been submitted and requires review.',
      '/admin/orders/' || new.id
    from profiles
    where role in ('admin', 'manager') and is_active = true;
  end if;

  -- Notify analyst on assignment
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
    select p.id into v_client_profile_id
    from clients c
    join profiles p on p.id = c.profile_id
    where c.id = new.client_id;

    if v_client_profile_id is not null then
      insert into notifications (user_id, type, title, message, link)
      values (
        v_client_profile_id, 'order_completed',
        'Your Order is Complete',
        'Order ' || new.order_number || ' has been completed. Results are now available.',
        '/client/orders/' || new.id
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger on_order_status_changed
  after update of status on orders
  for each row execute function notify_on_order_status_change();

-- ============================================================
-- AUTO-COMPLETE ORDER when all samples done
-- ============================================================
create or replace function check_order_completion()
returns trigger language plpgsql security definer as $$
declare
  v_order_id uuid;
  v_total_samples integer;
  v_completed_samples integer;
begin
  select order_id into v_order_id from samples where id = new.id;

  select count(*) into v_total_samples from samples where order_id = v_order_id;
  select count(*) into v_completed_samples from samples
  where order_id = v_order_id and status = 'completed';

  if v_total_samples > 0 and v_total_samples = v_completed_samples then
    update orders set status = 'review', updated_at = now() where id = v_order_id and status = 'in_progress';
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
alter table profiles enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table orders enable row level security;
alter table samples enable row level security;
alter table tests enable row level security;
alter table sample_tests enable row level security;
alter table results enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- Helper function: get current user role
create or replace function get_user_role(user_id uuid)
returns user_role language sql security definer stable as $$
  select role from profiles where id = user_id;
$$;

-- PROFILES policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (get_user_role(auth.uid()) in ('admin', 'manager'));
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can update any profile" on profiles for update using (get_user_role(auth.uid()) in ('admin', 'manager'));
create policy "Admins can insert profiles" on profiles for insert with check (get_user_role(auth.uid()) in ('admin', 'manager'));

-- CLIENTS policies
create policy "Staff can view all clients" on clients for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "Client can view own record" on clients for select using (profile_id = auth.uid());
create policy "Admins can manage clients" on clients for all using (get_user_role(auth.uid()) in ('admin', 'manager'));

-- PROJECTS policies
create policy "Staff can view all projects" on projects for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "Client can view own projects" on projects for select using (
  client_id in (select id from clients where profile_id = auth.uid())
);
create policy "Admins can manage projects" on projects for all using (get_user_role(auth.uid()) in ('admin', 'manager'));

-- ORDERS policies
create policy "Staff can view all orders" on orders for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "Client can view own orders" on orders for select using (
  client_id in (select id from clients where profile_id = auth.uid())
);
create policy "Client can submit orders" on orders for insert with check (
  client_id in (select id from clients where profile_id = auth.uid())
);
create policy "Admins can manage orders" on orders for all using (get_user_role(auth.uid()) in ('admin', 'manager'));
create policy "Analysts can update assigned orders" on orders for update using (
  get_user_role(auth.uid()) = 'analyst' and assigned_analyst_id = auth.uid()
);

-- SAMPLES policies
create policy "Staff can view all samples" on samples for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "Client can view own samples" on samples for select using (
  order_id in (select id from orders where client_id in (select id from clients where profile_id = auth.uid()))
);
create policy "Staff can manage samples" on samples for all using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));

-- TESTS policies
create policy "Everyone can view tests" on tests for select using (auth.uid() is not null);
create policy "Admins can manage tests" on tests for all using (get_user_role(auth.uid()) in ('admin', 'manager'));

-- SAMPLE_TESTS policies
create policy "Staff can view all sample tests" on sample_tests for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "Client can view own sample tests" on sample_tests for select using (
  sample_id in (
    select s.id from samples s
    join orders o on o.id = s.order_id
    join clients c on c.id = o.client_id
    where c.profile_id = auth.uid()
  )
);
create policy "Staff can manage sample tests" on sample_tests for all using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));

-- RESULTS policies
create policy "Staff can view all results" on results for select using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));
create policy "Client can view own results" on results for select using (
  sample_test_id in (
    select st.id from sample_tests st
    join samples s on s.id = st.sample_id
    join orders o on o.id = s.order_id
    join clients c on c.id = o.client_id
    where c.profile_id = auth.uid()
  )
);
create policy "Analysts can enter results" on results for all using (get_user_role(auth.uid()) in ('admin', 'manager', 'analyst'));

-- NOTIFICATIONS policies
create policy "Users see own notifications" on notifications for select using (user_id = auth.uid());
create policy "Users can mark own notifications read" on notifications for update using (user_id = auth.uid());
create policy "System can insert notifications" on notifications for insert with check (true);

-- AUDIT LOGS policies
create policy "Admins can view audit logs" on audit_logs for select using (get_user_role(auth.uid()) in ('admin', 'manager'));
create policy "System can insert audit logs" on audit_logs for insert with check (true);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_orders_client_id on orders(client_id);
create index idx_orders_status on orders(status);
create index idx_orders_assigned_analyst on orders(assigned_analyst_id);
create index idx_samples_order_id on samples(order_id);
create index idx_sample_tests_sample_id on sample_tests(sample_id);
create index idx_results_sample_test_id on results(sample_test_id);
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_is_read on notifications(user_id, is_read);
create index idx_audit_logs_table_record on audit_logs(table_name, record_id);

-- ============================================================
-- REALTIME (enable for live notifications)
-- ============================================================
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table orders;
