-- =====================================================================
-- ClassCadence — Row-Level Security for Neon (Neon Authorize)
-- Port of supabase/migrations/0002_rls_policies.sql (+ 0003/0004 policies).
--
-- KEY DIFFERENCE FROM SUPABASE:
--   Supabase exposed auth.uid() (the logged-in user's id from the JWT).
--   Neon Authorize exposes auth.user_id() (text) via the pg_session_jwt
--   extension. We wrap it so the rest of the policies read identically.
--
-- Run this AFTER drizzle pushes the table schema (drizzle-kit push/migrate),
-- because the policies reference those tables. Apply with:
--   psql "$DATABASE_URL" -f lib/db/rls.sql
-- =====================================================================

-- Neon Authorize installs pg_session_jwt and grants the `authenticated`
-- role. auth.user_id() returns the JWT `sub` claim as text.
-- Shim so every downstream policy can keep saying auth.uid().
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(auth.user_id(), '')::uuid
$$;

-- =====================================================================
-- Helper functions (unchanged bodies — they call auth.uid())
-- =====================================================================
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

-- Drizzle's neon-http authenticated connection runs as the `authenticated`
-- role. Grant it usage so RLS-protected queries work; INSERT/UPDATE/DELETE
-- are still gated by the policies below.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- =====================================================================
-- Enable RLS on every tenant-scoped table
-- (Drizzle .enableRLS() in schema can also do this; kept here so the file
-- is self-contained and idempotent.)
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
alter table notifications            enable row level security;

-- =====================================================================
-- tenants
-- =====================================================================
drop policy if exists tenants_super_admin_all on tenants;
create policy tenants_super_admin_all on tenants
  using (auth_is_super_admin()) with check (auth_is_super_admin());

drop policy if exists tenants_member_read on tenants;
create policy tenants_member_read on tenants for select
  using (id = auth_tenant_id());

-- =====================================================================
-- user_profiles
-- =====================================================================
drop policy if exists profiles_self_read on user_profiles;
create policy profiles_self_read on user_profiles for select
  using (id = auth.uid() or auth_is_super_admin());

drop policy if exists profiles_self_update on user_profiles;
create policy profiles_self_update on user_profiles for update
  using (id = auth.uid());

drop policy if exists profiles_super_admin_all on user_profiles;
create policy profiles_super_admin_all on user_profiles
  using (auth_is_super_admin()) with check (auth_is_super_admin());

drop policy if exists profiles_tenant_admin_read on user_profiles;
create policy profiles_tenant_admin_read on user_profiles for select
  using (tenant_id is not null
         and tenant_id = auth_tenant_id()
         and auth_role() in ('tenant_admin','location_admin'));

-- =====================================================================
-- branding_assets
-- =====================================================================
drop policy if exists branding_tenant_read on branding_assets;
create policy branding_tenant_read on branding_assets for select
  using (tenant_id = auth_tenant_id() or auth_is_super_admin());

drop policy if exists branding_tenant_admin_write on branding_assets;
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
-- locations
-- =====================================================================
drop policy if exists locations_read on locations;
create policy locations_read on locations for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
drop policy if exists locations_write on locations;
create policy locations_write on locations
  for all using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin'))
  )
  with check (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin'))
  );

-- user_locations
drop policy if exists user_locations_read on user_locations;
create policy user_locations_read on user_locations for select
  using (
    auth_is_super_admin()
    or exists (
      select 1 from locations l
      where l.id = user_locations.location_id
        and l.tenant_id = auth_tenant_id()
    )
  );

-- operating_hours_rules
drop policy if exists ohr_read on operating_hours_rules;
create policy ohr_read on operating_hours_rules for select
  using (
    auth_is_super_admin()
    or exists (select 1 from locations l where l.id = location_id and l.tenant_id = auth_tenant_id())
  );
drop policy if exists ohr_write on operating_hours_rules;
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

-- holiday_closures
drop policy if exists holiday_read on holiday_closures;
create policy holiday_read on holiday_closures for select
  using (
    auth_is_super_admin()
    or exists (select 1 from locations l where l.id = location_id and l.tenant_id = auth_tenant_id())
  );
drop policy if exists holiday_write on holiday_closures;
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

-- classrooms
drop policy if exists classrooms_read on classrooms;
create policy classrooms_read on classrooms for select
  using (
    auth_is_super_admin()
    or exists (select 1 from locations l where l.id = location_id and l.tenant_id = auth_tenant_id())
  );
drop policy if exists classrooms_write on classrooms;
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

-- time_slots
drop policy if exists time_slots_read on time_slots;
create policy time_slots_read on time_slots for select
  using (
    auth_is_super_admin()
    or exists (
      select 1 from classrooms c
      join locations l on l.id = c.location_id
      where c.id = classroom_id and l.tenant_id = auth_tenant_id()
    )
  );
drop policy if exists time_slots_write on time_slots;
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

-- households
drop policy if exists households_read on households;
create policy households_read on households for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
drop policy if exists households_write on households;
create policy households_write on households
  for all using (auth_is_super_admin() or tenant_id = auth_tenant_id())
  with check (auth_is_super_admin() or tenant_id = auth_tenant_id());

-- students
drop policy if exists students_read on students;
create policy students_read on students for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
drop policy if exists students_write on students;
create policy students_write on students
  for all using (auth_is_super_admin() or tenant_id = auth_tenant_id())
  with check (auth_is_super_admin() or tenant_id = auth_tenant_id());

-- bulk_messages
drop policy if exists bulk_msgs_read on bulk_messages;
create policy bulk_msgs_read on bulk_messages for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
drop policy if exists bulk_msgs_write on bulk_messages;
create policy bulk_msgs_write on bulk_messages
  for all using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  )
  with check (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  );

-- import_jobs
drop policy if exists import_jobs_read on import_jobs;
create policy import_jobs_read on import_jobs for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
drop policy if exists import_jobs_write on import_jobs;
create policy import_jobs_write on import_jobs
  for all using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  )
  with check (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  );

-- resource_files
drop policy if exists resource_files_read on resource_files;
create policy resource_files_read on resource_files for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());
drop policy if exists resource_files_write on resource_files;
create policy resource_files_write on resource_files
  for all using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  )
  with check (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  );

-- notification_events (read-only from user context)
drop policy if exists notif_events_read on notification_events;
create policy notif_events_read on notification_events for select
  using (auth_is_super_admin() or tenant_id = auth_tenant_id());

-- audit_log
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select
  using (
    auth_is_super_admin()
    or (tenant_id = auth_tenant_id() and auth_role() in ('tenant_admin','location_admin'))
  );

-- student_status_history
drop policy if exists ssh_read on student_status_history;
create policy ssh_read on student_status_history for select
  using (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  );

-- enrollments
drop policy if exists enrollments_read on enrollments;
create policy enrollments_read on enrollments for select
  using (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  );
drop policy if exists enrollments_write on enrollments;
create policy enrollments_write on enrollments
  for all using (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  )
  with check (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  );

-- waitlist_entries
drop policy if exists waitlist_read on waitlist_entries;
create policy waitlist_read on waitlist_entries for select
  using (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  );
drop policy if exists waitlist_write on waitlist_entries;
create policy waitlist_write on waitlist_entries
  for all using (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  )
  with check (
    auth_is_super_admin()
    or exists (select 1 from students s where s.id = student_id and s.tenant_id = auth_tenant_id())
  );

-- sessions
drop policy if exists sessions_read on sessions;
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

-- attendance_records
drop policy if exists attendance_read on attendance_records;
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
drop policy if exists attendance_write on attendance_records;
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

-- makeup_offers (read 0002 + write 0003)
drop policy if exists makeup_read on makeup_offers;
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
drop policy if exists makeup_write on makeup_offers;
create policy makeup_write on makeup_offers
  for all using (
    auth_is_super_admin()
    or exists (
      select 1 from attendance_records ar
      join sessions s on s.id = ar.session_id
      join time_slots ts on ts.id = s.time_slot_id
      join classrooms c on c.id = ts.classroom_id
      join locations  l on l.id = c.location_id
      where ar.id = absent_attendance_id
        and l.tenant_id = auth_tenant_id()
        and auth_role() in ('tenant_admin','location_admin','front_desk')
    )
  )
  with check (
    auth_is_super_admin()
    or exists (
      select 1 from attendance_records ar
      join sessions s on s.id = ar.session_id
      join time_slots ts on ts.id = s.time_slot_id
      join classrooms c on c.id = ts.classroom_id
      join locations  l on l.id = c.location_id
      where ar.id = absent_attendance_id
        and l.tenant_id = auth_tenant_id()
        and auth_role() in ('tenant_admin','location_admin','front_desk')
    )
  );

-- lesson_notes (read 0002 + write 0003)
drop policy if exists notes_read on lesson_notes;
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
drop policy if exists notes_write on lesson_notes;
create policy notes_write on lesson_notes
  for all using (
    auth_is_super_admin()
    or exists (
      select 1 from attendance_records ar
      join sessions s on s.id = ar.session_id
      join time_slots ts on ts.id = s.time_slot_id
      join classrooms c on c.id = ts.classroom_id
      join locations  l on l.id = c.location_id
      where ar.id = attendance_record_id
        and l.tenant_id = auth_tenant_id()
        and auth_role() in ('tenant_admin','location_admin','front_desk')
    )
  )
  with check (
    auth_is_super_admin()
    or exists (
      select 1 from attendance_records ar
      join sessions s on s.id = ar.session_id
      join time_slots ts on ts.id = s.time_slot_id
      join classrooms c on c.id = ts.classroom_id
      join locations  l on l.id = c.location_id
      where ar.id = attendance_record_id
        and l.tenant_id = auth_tenant_id()
        and auth_role() in ('tenant_admin','location_admin','front_desk')
    )
  );

-- notification_preferences
drop policy if exists notif_prefs_read on notification_preferences;
create policy notif_prefs_read on notification_preferences for select
  using (
    auth_is_super_admin()
    or exists (select 1 from households h where h.id = household_id and h.tenant_id = auth_tenant_id())
  );

-- calendar_feed_tokens
drop policy if exists ical_self on calendar_feed_tokens;
create policy ical_self on calendar_feed_tokens for select
  using (user_id = auth.uid() or auth_is_super_admin());

-- notifications (0004) — self read + self update
drop policy if exists notifications_select_own on notifications;
create policy notifications_select_own on notifications for select
  using (user_id = auth.uid());
drop policy if exists notifications_update_own on notifications;
create policy notifications_update_own on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
