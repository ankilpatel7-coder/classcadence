-- =====================================================================
-- ClassCadence — DDL that Drizzle's schema DSL can't express cleanly.
-- Apply AFTER drizzle push/migrate, BEFORE rls.sql (order doesn't strictly
-- matter, but keep it with the schema step).
--   psql "$DATABASE_URL" -f lib/db/extra.sql
-- =====================================================================

-- citext extension (used by email columns). pgcrypto for gen_random_uuid().
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- time_slots: the no-overlap uniqueness is a PARTIAL index (active rows only).
-- Drizzle's index() can't express the WHERE clause, so define it here and
-- drop the plain index Drizzle would otherwise create with the same name.
drop index if exists time_slots_no_overlap;
create unique index time_slots_no_overlap
  on time_slots(classroom_id, weekday, start_time, end_time)
  where status = 'active';

-- waitlist_entries: the (time_slot_id, position) unique is DEFERRABLE so
-- positions can be shuffled within a transaction. Replace the plain unique
-- constraint Drizzle creates with a deferrable one.
alter table waitlist_entries
  drop constraint if exists waitlist_entries_slot_position_key;
alter table waitlist_entries
  add constraint waitlist_entries_slot_position_key
  unique (time_slot_id, position) deferrable initially deferred;

-- updated_at trigger (ported from 0001). Drizzle doesn't manage triggers.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in
    select unnest(array['tenants','user_profiles','locations','households',
                        'students','attendance_records','lesson_notes',
                        'notification_events','branding_assets'])
  loop
    execute format('drop trigger if exists trg_%I_updated on %I;', t, t);
    execute format(
      'create trigger trg_%I_updated before update on %I
       for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- NOTE: the Supabase handle_new_user() trigger on auth.users is intentionally
-- NOT ported. Under Neon Auth there is no auth.users table to hook; the app
-- upserts user_profiles when a Stack user is created (admin flows) or on
-- first sign-in. See lib/auth.
