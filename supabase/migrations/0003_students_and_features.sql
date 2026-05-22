-- =====================================================================
-- ClassCadence — 0003: student-centric parent info + per-location quota
-- =====================================================================

-- 1. Move parent contact info onto students. Households table is kept
--    in place for any orphaned references (notification_preferences,
--    notification_events, bulk_messages) but new students don't need one.
alter table students
  add column primary_parent_name text,
  add column primary_email citext,
  add column primary_phone text,
  add column secondary_parent_name text,
  add column secondary_email citext,
  add column secondary_phone text,
  add column mailing_address text,
  add column notification_prefs_json jsonb not null default '{"email":true,"whatsapp":true}'::jsonb;

-- Backfill existing students from their household.
update students s
set primary_parent_name = h.primary_parent_name,
    primary_email = h.primary_email,
    primary_phone = h.primary_phone,
    secondary_parent_name = h.secondary_parent_name,
    secondary_email = h.secondary_email,
    secondary_phone = h.secondary_phone,
    mailing_address = h.mailing_address,
    notification_prefs_json = h.notification_prefs_json
from households h
where s.household_id = h.id;

-- household_id is now optional. Existing students keep their link;
-- new ones can skip it entirely.
alter table students alter column household_id drop not null;

-- Require at least primary email or phone, matching the spirit of the
-- old household constraint. NOT VALID so any malformed legacy rows
-- don't block the migration; validate manually after cleanup.
alter table students
  add constraint students_parent_contact_required
  check (primary_email is not null or primary_phone is not null)
  not valid;

create index if not exists students_primary_email_idx on students(primary_email);

-- 2. Per-location class quota (BA: "some locations allow 2 classes of
--    30 mins per week"). Default 2 so existing centers behave sanely.
alter table locations
  add column max_classes_per_student_per_week int not null default 2
  check (
    max_classes_per_student_per_week >= 1
    and max_classes_per_student_per_week <= 20
  );

-- 3. Make-up offers FK already exists (BA 8.10). No schema change needed.
-- 4. Lesson notes table already exists (BA 8.16). No schema change needed.
-- 5. branding_assets already exists (BA 8.19). No schema change needed.

-- 6. Write-side RLS for lesson_notes and makeup_offers (read was added in 0002).
do $$
begin
  -- lesson_notes: insert/update permitted for any tenant member whose role
  -- can manage attendance (front_desk / location_admin / tenant_admin), scoped
  -- via attendance_record -> session -> time_slot -> classroom -> location.
  if not exists (select 1 from pg_policies where policyname = 'notes_write' and tablename = 'lesson_notes') then
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
  end if;

  if not exists (select 1 from pg_policies where policyname = 'makeup_write' and tablename = 'makeup_offers') then
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
  end if;
end $$;

-- Refresh PostgREST's schema cache.
notify pgrst, 'reload schema';
