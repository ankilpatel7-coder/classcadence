-- =====================================================================
-- ClassCadence — Row-Level Security policies
-- Source: BA Document Sections 6.2 (permissions), 11.2 (isolation strategy),
-- and 15 (security). Every tenant-scoped table is locked down so a query
-- can only ever return rows belonging to the caller's tenant.
-- =====================================================================

-- Helper: return the caller's tenant_id from their profile.
-- Stable + SECURITY DEFINER so it can read user_profiles without infinite
-- recursion through RLS on user_profiles itself.
create or replace function auth_tenant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from public.user_profiles where id = auth.uid()
$$;

create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.user_profiles where id = auth.uid()
$$;

create or replace function auth_is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'super_admin' from public.user_profiles where id = auth.uid()),
    false
  )
$$;

-- =====================================================================
-- Enable RLS on every tenant-scoped table
-- =====================================================================
alter table tenants                  enable row level security;
alter table branding_assets          enable row level security;
alter table user_profiles            enable row level security;
alter table locations                enable row level security;
alter table user_locations           enable row level security;
alter table operating_hours_rules    enable row level security;
alter table holiday_closures         enable row level security;
alter table classrooms               enable row level security;
alter table time_slots               enable row level security;
alter table households               enable row level security;
alter table students                 enable row level security;
alter table student_status_history   enable row level security;
alter table enrollments              enable row level security;
alter table waitlist_entries         enable row level security;
alter table sessions                 enable row level security;
alter table attendance_records       enable row level security;
alter table makeup_offers            enable row level security;
alter table lesson_notes             enable row level security;
alter table notification_events      enable row level security;
alter table notification_preferences enable row level security;
alter table bulk_messages            enable row level security;
alter table import_jobs              enable row level security;
alter table resource_files           enable row level security;
alter table calendar_feed_tokens     enable row level security;
alter table audit_log                enable row level security;

-- =====================================================================
-- tenants
--   - Super Admin: full
--   - Members of a tenant: read their own tenant row only
-- =====================================================================
create policy tenants_super_admin_all on tenants
  using (auth_is_super_admin()) with check (auth_is_super_admin());

create policy tenants_member_read on tenants for select
  using (id = auth_tenant_id());

-- =====================================================================
-- user_profiles
--   - Self: read + update own row
--   - Super Admin: full
--   - Tenant Admin: read profiles in their tenant
-- =====================================================================
create policy profiles_self_read on user_profiles for select
  using (id = auth.uid() or auth_is_super_admin());

create policy profiles_self_update on user_profiles for update
  using (id = auth.uid());

create policy profiles_super_admin_all on user_profiles
  using (auth_is_super_admin()) with check (auth_is_super_admin());

create policy profiles_tenant_admin_read on user_profiles for select
  using (tenant_id is not null
         and tenant_id = auth_tenant_id()
         and auth_role() in ('tenant_admin','location_admin'));

-- =====================================================================
-- branding_assets — tenant-scoped, edit by tenant_admin
-- =====================================================================
create policy branding_tenant_read on branding_assets for select
  using (tenant_id = auth_tenant_id() or auth_is_super_admin());

create policy branding_tenant_admin_write on branding_assets
  for all using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() = 'tenant_admin')
  )
  with check (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() = 'tenant_admin')
  );

-- =====================================================================
-- Generic tenant-scoped table policy macro
-- Every tenant-scoped table follows the same pattern: rows visible to a
-- member of the same tenant; super_admin sees everything.
-- =====================================================================
do $$
declare
  t text;
  tenant_tables text[] := array[
    'locations','households','students','student_status_history',
    'enrollments','waitlist_entries','sessions','attendance_records',
    'makeup_offers','lesson_notes','notification_events',
    'notification_preferences','bulk_messages','import_jobs',
    'resource_files','operating_hours_rules','holiday_closures',
    'classrooms','time_slots','audit_log'
  ];
begin
  foreach t in array tenant_tables loop
    -- For tables that have a direct tenant_id column, use it directly.
    -- For nested tables, we'll override below with table-specific policies.
    null;
  end loop;
end $$;

-- locations: direct tenant_id
create policy locations_read on locations for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
create policy locations_write on locations
  for all using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin'))
  )
  with check (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin'))
  );

-- user_locations: derive tenant from joined location
create policy user_locations_read on user_locations for select
  using (
    auth_is_super_admin()
    or exists (
      select 1 from locations l
      where l.id = user_locations.location_id
        and l.tenant_id = auth_tenant_id()
    )
  );

-- operating_hours_rules, holiday_closures, classrooms, time_slots:
-- derive tenant via locations.
create policy ohr_read on operating_hours_rules for select
  using (
    auth_is_super_admin()
    or exists (select 1 from locations l where l.id = location_id and l.tenant_id = auth_tenant_id())
  );
create policy ohr_write on operating_hours_rules
  for all using (
    auth_is_super_admin()
    or exists (select 1 from locations l
               where l.id = location_id and l.tenant_id = auth_tenant_id()
                 and auth_role() in ('tenant_admin','location_admin'))
  )
  with check (
    auth_is_super_admin()
    or exists (select 1 from locations l
               where l.id = location_id and l.tenant_id = auth_tenant_id()
                 and auth_role() in ('tenant_admin','location_admin'))
  );

create policy holiday_read on holiday_closures for select
  using (
    auth_is_super_admin()
    or exists (select 1 from locations l where l.id = location_id and l.tenant_id = auth_tenant_id())
  );
create policy holiday_write on holiday_closures
  for all using (
    auth_is_super_admin()
    or exists (select 1 from locations l
               where l.id = location_id and l.tenant_id = auth_tenant_id()
                 and auth_role() in ('tenant_admin','location_admin'))
  )
  with check (
    auth_is_super_admin()
    or exists (select 1 from locations l
               where l.id = location_id and l.tenant_id = auth_tenant_id()
                 and auth_role() in ('tenant_admin','location_admin'))
  );

create policy classrooms_read on classrooms for select
  using (
    auth_is_super_admin()
    or exists (select 1 from locations l where l.id = location_id and l.tenant_id = auth_tenant_id())
  );
create policy classrooms_write on classrooms
  for all using (
    auth_is_super_admin()
    or exists (select 1 from locations l
               where l.id = location_id and l.tenant_id = auth_tenant_id()
                 and auth_role() in ('tenant_admin','location_admin'))
  )
  with check (
    auth_is_super_admin()
    or exists (select 1 from locations l
               where l.id = location_id and l.tenant_id = auth_tenant_id()
                 and auth_role() in ('tenant_admin','location_admin'))
  );

create policy time_slots_read on time_slots for select
  using (
    auth_is_super_admin()
    or exists (
      select 1 from classrooms c
      join locations l on l.id = c.location_id
      where c.id = classroom_id and l.tenant_id = auth_tenant_id()
    )
  );
create policy time_slots_write on time_slots
  for all using (
    auth_is_super_admin()
    or exists (
      select 1 from classrooms c
      join locations l on l.id = c.location_id
      where c.id = classroom_id and l.tenant_id = auth_tenant_id()
        and auth_role() in ('tenant_admin','location_admin')
    )
  )
  with check (
    auth_is_super_admin()
    or exists (
      select 1 from classrooms c
      join locations l on l.id = c.location_id
      where c.id = classroom_id and l.tenant_id = auth_tenant_id()
        and auth_role() in ('tenant_admin','location_admin')
    )
  );

-- Direct tenant_id tables: households, students, bulk_messages, import_jobs,
-- resource_files, notification_events, audit_log.
create policy households_read on households for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
create policy households_write on households
  for all using (auth_is_super_admin() or tenant_id = auth_tenant_id())
  with check (auth_is_super_admin() or tenant_id = auth_tenant_id());

create policy students_read on students for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
create policy students_write on students
  for all using (auth_is_super_admin() or tenant_id = auth_tenant_id())
  with check (auth_is_super_admin() or tenant_id = auth_tenant_id());

create policy bulk_msgs_read on bulk_messages for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
create policy bulk_msgs_write on bulk_messages
  for all using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  )
  with check (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  );

create policy import_jobs_read on import_jobs for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
create policy import_jobs_write on import_jobs
  for all using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  )
  with check (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  );

create policy resource_files_read on resource_files for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
create policy resource_files_write on resource_files
  for all using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  )
  with check (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  );

create policy notif_events_read on notification_events for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());

create policy audit_read on audit_log for select
  using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  );

-- student_status_history, enrollments, waitlist_entries: via students
create policy ssh_read on student_status_history for select
  using (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  );

create policy enrollments_read on enrollments for select
  using (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  );
create policy enrollments_write on enrollments
  for all using (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  )
  with check (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  );

create policy waitlist_read on waitlist_entries for select
  using (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  );
create policy waitlist_write on waitlist_entries
  for all using (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  )
  with check (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  );

-- sessions: via classrooms → locations → tenants
create policy sessions_read on sessions for select
  using (
    auth_is_super_admin()
    or exists (
      select 1 from time_slots ts
      join classrooms c on c.id = ts.classroom_id
      join locations  l on l.id = c.location_id
      where ts.id = time_slot_id and l.tenant_id = auth_tenant_id()
    )
  );

-- attendance_records: via sessions
create policy attendance_read on attendance_records for select
  using (
    auth_is_super_admin()
    or exists (
      select 1 from sessions s
      join time_slots ts on ts.id = s.time_slot_id
      join classrooms c on c.id = ts.classroom_id
      join locations  l on l.id = c.location_id
      where s.id = session_id and l.tenant_id = auth_tenant_id()
    )
  );
create policy attendance_write on attendance_records
  for all using (
    auth_is_super_admin()
    or exists (
      select 1 from sessions s
      join time_slots ts on ts.id = s.time_slot_id
      join classrooms c on c.id = ts.classroom_id
      join locations  l on l.id = c.location_id
      where s.id = session_id and l.tenant_id = auth_tenant_id()
    )
  )
  with check (
    auth_is_super_admin()
    or exists (
      select 1 from sessions s
      join time_slots ts on ts.id = s.time_slot_id
      join classrooms c on c.id = ts.classroom_id
      join locations  l on l.id = c.location_id
      where s.id = session_id and l.tenant_id = auth_tenant_id()
    )
  );

-- makeup_offers: via attendance_records → sessions → ...
create policy makeup_read on makeup_offers for select
  using (
    auth_is_super_admin()
    or exists (
      select 1 from attendance_records ar
      join sessions s on s.id = ar.session_id
      join time_slots ts on ts.id = s.time_slot_id
      join classrooms c on c.id = ts.classroom_id
      join locations  l on l.id = c.location_id
      where ar.id = absent_attendance_id and l.tenant_id = auth_tenant_id()
    )
  );

-- lesson_notes: via attendance_records → ...
create policy notes_read on lesson_notes for select
  using (
    auth_is_super_admin()
    or exists (
      select 1 from attendance_records ar
      join sessions s on s.id = ar.session_id
      join time_slots ts on ts.id = s.time_slot_id
      join classrooms c on c.id = ts.classroom_id
      join locations  l on l.id = c.location_id
      where ar.id = attendance_record_id and l.tenant_id = auth_tenant_id()
    )
  );

-- notification_preferences: via households
create policy notif_prefs_read on notification_preferences for select
  using (
    auth_is_super_admin()
    or exists (select 1 from households h where h.id = household_id and h.tenant_id = auth_tenant_id())
  );

-- calendar_feed_tokens: self only
create policy ical_self on calendar_feed_tokens for select
  using (user_id = auth.uid() or auth_is_super_admin());
