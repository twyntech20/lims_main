-- ============================================================
-- Task 3: identify the work inside the assignment notification
--
-- The analyst notification said only "Order ORD-1014 has been assigned to
-- you." — enough to know something arrived, not enough to know what it was
-- without opening the queue and hunting for it. It also linked to the generic
-- work queue rather than the order itself.
--
-- The order_assigned branch now names the client, the departments, and the
-- samples, links straight to the order, and fills the metadata column that
-- has existed on notifications all along. Nothing else about the function
-- changes: the order_submitted and order_completed branches and the
-- status-unchanged guard are preserved exactly as they were.
--
-- No new table, column, enum value, RLS policy, or notification mechanism.
-- ============================================================

create or replace function public.notify_on_order_status_change()
returns trigger
language plpgsql
security definer
as $function$
declare
  v_client_name  text;
  v_categories   text[];
  v_dept         text;
  v_sample_count integer;
  v_sample_list  text;
  v_title        text;
  v_message      text;
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

    select c.client_name into v_client_name
    from clients c where c.id = new.client_id;

    select count(*), string_agg(s.sample_id, ', ' order by s.sample_id)
      into v_sample_count, v_sample_list
    from samples s where s.order_id = new.id;

    -- Departments come from the catalog, the same source the specialty rules
    -- read. A mixed order yields both, so the analyst sees what they are
    -- taking on; an order whose tests carry no category yields none, and the
    -- message simply omits the department rather than inventing one.
    select array_agg(distinct initcap(t.category::text) order by initcap(t.category::text))
      into v_categories
    from samples s
    join sample_tests st on st.sample_id = s.id
    join tests t on t.id = st.test_id
    where s.order_id = new.id
      and t.category is not null
      and t.category::text <> '';

    v_dept := array_to_string(v_categories, ' and ');

    -- A long sample list would swamp the notification row in the UI.
    if length(coalesce(v_sample_list, '')) > 120 then
      v_sample_list := left(v_sample_list, 117) || '...';
    end if;

    v_title := case
      when coalesce(v_dept, '') <> '' then v_dept || ' Order Assigned to You'
      else 'Order Assigned to You'
    end;

    v_message :=
      'Order ' || new.order_number
      || coalesce(' for ' || v_client_name, '')
      || case when coalesce(v_dept, '') <> '' then ' - ' || v_dept else '' end
      || case
           when coalesce(v_sample_count, 0) > 0
             then ' - ' || v_sample_count || ' sample'
                  || case when v_sample_count = 1 then '' else 's' end
                  || coalesce(' (' || v_sample_list || ')', '')
           else ''
         end
      || ' has been assigned to you.';

    insert into notifications (user_id, type, title, message, link, metadata)
    values (
      new.assigned_analyst_id, 'order_assigned',
      v_title,
      v_message,
      '/analyst/orders/' || new.id,
      jsonb_build_object(
        'client_name',  v_client_name,
        'order_number', new.order_number,
        'order_id',     new.id,
        'categories',   coalesce(to_jsonb(v_categories), '[]'::jsonb),
        'sample_count', coalesce(v_sample_count, 0)
      )
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
$function$;
