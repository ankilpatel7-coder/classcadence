-- =====================================================================
-- ClassCadence — Core Schema
-- Maps to BA Document Section 11. Pooled multi-tenant: every tenant-owned
-- row carries tenant_id; RLS policies in 0002 enforce isolation.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =====================================================================
-- Enums
-- =====================================================================
create type user_role        as enum ('super_admin', 'tenant_admin', 'location_admin', 'front_desk');
create type tenant_status    as enum ('active', 'suspended');
create type location_status  as enum ('active', 'inactive');
create type classroom_status as enum ('active', 'inactive');
create type weekday          as enum ('mon','tue','wed','thu','fri','sat','sun');
create type lifecycle_status as enum ('lead','trial','active','waitlist','inactive','withdrawn');
create type attendance_status as enum ('expected','present','late','absent','excused','made_up');
create type makeup_state     as enum ('pending','accepted','declined','expired');
create type notif_channel    as enum ('email','whatsapp');
create type notif_state      as enum ('queued','sent','delivered','read','failed');
create type note_visibility  as enum ('parent','internal');

-- =====================================================================
-- Tenants (BA 11.1)
-- =====================================================================
create table tenants (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  legal_name      text,
  default_iana_tz text not null default 'America/New_York',
  country         text not null default 'US',
  currency        text not null default 'USD',
  status          tenant_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Branding asset (BA 8.19) — 0..1 per tenant
create table branding_assets (
  tenant_id              uuid primary key references tenants(id) on delete cascade,
  logo_url               text,
  primary_color_hex      text default '#1E3A8A',
  sender_display_name    text,
  email_signature_html   text,
  email_banner_url       text,
  whatsapp_display_name  text,
  updated_at             timestamptz not null default now()
);

-- =====================================================================
-- Users — uses Supabase Auth. We extend auth.users via a public profile.
-- =====================================================================
create table user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        citext not null unique,
  full_name    text,
  phone        text,
  role         user_role not null default 'front_desk',
  -- Super Admin has tenant_id = null; everyone else belongs to one tenant.
  tenant_id    uuid references tenants(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =====================================================================
-- Locations (BA 8.2 + 11.1)
-- =====================================================================
create table locations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  name            text not null,
  address_line1   text,
  address_line2   text,
  city            text,
  region          text,
  postal_code     text,
  country         text default 'US',
  iana_timezone   text not null,
  phone           text,
  support_email   citext,
  status          location_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Mapping users → locations they can act on (BA 11.1 UserLocation)
create table user_locations (
  user_id          uuid not null references user_profiles(id) on delete cascade,
  location_id      uuid not null references locations(id)     on delete cascade,
  role_at_location user_role not null,
  primary key (user_id, location_id)
);

-- =====================================================================
-- Operating hours (BA 8.3) — multi-window per weekday supported
-- =====================================================================
create table operating_hours_rules (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  weekday     weekday not null,
  open_time   time not null,
  close_time  time not null,
  check       (close_time > open_time)
);

create table holiday_closures (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  reason      text,
  check (end_date >= start_date)
);

-- =====================================================================
-- Classrooms (BA 8.4)
-- =====================================================================
create table classrooms (
  id               uuid primary key default gen_random_uuid(),
  location_id      uuid not null references locations(id) on delete cascade,
  name             text not null,
  description      text,
  default_capacity int not null default 8 check (default_capacity > 0),
  color            text default '#1E3A8A',
  status           classroom_status not null default 'active',
  created_at       timestamptz not null default now()
);

-- =====================================================================
-- Time slots (BA 8.5) — recurring weekly windows in a classroom
-- =====================================================================
create table time_slots (
  id                uuid primary key default gen_random_uuid(),
  classroom_id      uuid not null references classrooms(id) on delete cascade,
  weekday           weekday not null,
  start_time        time not null,
  end_time          time not null,
  capacity_override int,
  notes             text,
  status            classroom_status not null default 'active',
  created_at        timestamptz not null default now(),
  check (end_time > start_time)
);

create unique index time_slots_no_overlap
  on time_slots(classroom_id, weekday, start_time, end_time)
  where status = 'active';

-- =====================================================================
-- Households (BA 8.14) — siblings share one Household
-- =====================================================================
create table households (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references tenants(id) on delete cascade,
  primary_parent_name      text not null,
  primary_email            citext,
  primary_phone            text,
  secondary_parent_name    text,
  secondary_email          citext,
  secondary_phone          text,
  mailing_address          text,
  notification_prefs_json  jsonb not null default '{"email":true,"whatsapp":true}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (primary_email is not null or primary_phone is not null)
);

-- =====================================================================
-- Students (BA 8.6 + 8.15 lifecycle)
-- =====================================================================
create table students (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id)    on delete cascade,
  location_id         uuid not null references locations(id)  on delete restrict,
  household_id        uuid not null references households(id) on delete restrict,
  first_name          text not null,
  last_name           text not null,
  dob                 date,
  grade_level         text,
  lifecycle_status    lifecycle_status not null default 'active',
  trial_start_date    date,
  trial_end_date      date,
  photo_url           text,
  internal_notes      text,
  consent_obtained_at timestamptz,
  consent_method      text,
  consent_by_name     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index students_tenant_location_idx on students(tenant_id, location_id);
create index students_household_idx       on students(household_id);
create index students_lifecycle_idx       on students(tenant_id, lifecycle_status);

-- Lifecycle transitions (BA 8.15 / FR-SL-08)
create table student_status_history (
  id              bigserial primary key,
  student_id      uuid not null references students(id) on delete cascade,
  from_status     lifecycle_status,
  to_status       lifecycle_status not null,
  changed_by      uuid references user_profiles(id),
  changed_at      timestamptz not null default now(),
  reason          text
);

-- =====================================================================
-- Enrollments + Sessions + Attendance (BA 8.7–8.9)
-- =====================================================================
create table enrollments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references students(id)  on delete cascade,
  time_slot_id    uuid not null references time_slots(id) on delete restrict,
  effective_from  date not null,
  effective_to    date,
  created_at      timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);
create index enrollments_student_idx on enrollments(student_id);
create index enrollments_slot_idx    on enrollments(time_slot_id);

create table waitlist_entries (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references students(id)  on delete cascade,
  time_slot_id  uuid not null references time_slots(id) on delete cascade,
  position      int  not null,
  requested_at  timestamptz not null default now(),
  fulfilled_at  timestamptz,
  unique (time_slot_id, position) deferrable initially deferred
);

create table sessions (
  id                    uuid primary key default gen_random_uuid(),
  time_slot_id          uuid not null references time_slots(id) on delete cascade,
  scheduled_start_utc   timestamptz not null,
  scheduled_end_utc     timestamptz not null,
  status                text not null default 'open' check (status in ('open','closed','cancelled')),
  cancellation_reason   text,
  created_at            timestamptz not null default now(),
  unique (time_slot_id, scheduled_start_utc)
);
create index sessions_start_idx on sessions(scheduled_start_utc);

create table attendance_records (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references sessions(id) on delete cascade,
  student_id            uuid not null references students(id) on delete cascade,
  status                attendance_status not null default 'expected',
  check_in_at           timestamptz,
  check_out_at          timestamptz,
  duration_seconds      int generated always as (
                          case when check_in_at is not null and check_out_at is not null
                               then extract(epoch from (check_out_at - check_in_at))::int
                               else null end
                        ) stored,
  notes                 text,
  override_by           uuid references user_profiles(id),
  made_up_in_session_id uuid references sessions(id),
  excused_reason        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (session_id, student_id)
);
create index attendance_student_idx on attendance_records(student_id);
create index attendance_session_idx on attendance_records(session_id);

-- =====================================================================
-- Make-up offers (BA 8.10)
-- =====================================================================
create table makeup_offers (
  id                    uuid primary key default gen_random_uuid(),
  absent_attendance_id  uuid not null unique references attendance_records(id) on delete cascade,
  offered_session_id    uuid not null references sessions(id) on delete restrict,
  state                 makeup_state not null default 'pending',
  token_hash            text not null unique,
  offered_at            timestamptz not null default now(),
  offered_by            uuid references user_profiles(id),
  responded_at          timestamptz,
  expires_at            timestamptz not null
);

-- =====================================================================
-- Lesson notes (BA 8.16)
-- =====================================================================
create table lesson_notes (
  id                    bigserial primary key,
  attendance_record_id  uuid not null references attendance_records(id) on delete cascade,
  author_id             uuid references user_profiles(id),
  visibility            note_visibility not null default 'internal',
  body                  text not null,
  template_key          text,
  version               int  not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- =====================================================================
-- Notifications (BA 8.11) + Bulk messages (BA 8.17)
-- =====================================================================
create table notification_events (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  household_id    uuid references households(id) on delete set null,
  student_id      uuid references students(id)   on delete set null,
  recipient_email citext,
  recipient_phone text,
  channel         notif_channel not null,
  template_key    text not null,
  payload_json    jsonb not null default '{}'::jsonb,
  state           notif_state not null default 'queued',
  provider_id     text,
  dedup_key       text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, channel, dedup_key)
);
create index notif_events_state_idx on notification_events(state, created_at);

create table notification_preferences (
  household_id uuid not null references households(id) on delete cascade,
  channel      notif_channel not null,
  opted_in     boolean not null default true,
  updated_at   timestamptz not null default now(),
  primary key (household_id, channel)
);

create table bulk_messages (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  location_id           uuid references locations(id) on delete cascade,
  sender_id             uuid references user_profiles(id),
  category              text not null,
  channels              notif_channel[] not null,
  subject               text,
  body                  text not null,
  audience_query_json   jsonb not null default '{}'::jsonb,
  scheduled_for         timestamptz,
  sent_at               timestamptz,
  recipients_total      int default 0,
  recipients_suppressed int default 0,
  recipients_failed     int default 0,
  created_at            timestamptz not null default now()
);

-- =====================================================================
-- CSV imports (BA 8.20)
-- =====================================================================
create table import_jobs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  source_csv_url  text not null,
  mapping_json    jsonb not null default '{}'::jsonb,
  status          text not null default 'pending'
                  check (status in ('pending','dry_run','committed','failed')),
  rows_total      int default 0,
  rows_inserted   int default 0,
  rows_skipped    int default 0,
  errors_json     jsonb default '[]'::jsonb,
  created_by      uuid references user_profiles(id),
  created_at      timestamptz not null default now()
);

-- =====================================================================
-- Resource library (BA 8.22)
-- =====================================================================
create table resource_files (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  name        text not null,
  file_url    text not null,
  mime        text,
  size_bytes  bigint,
  uploaded_by uuid references user_profiles(id),
  tags        text[],
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- iCal feed tokens (BA 8.21)
-- =====================================================================
create table calendar_feed_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references user_profiles(id) on delete cascade,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

-- =====================================================================
-- Audit log (BA 8.13)
-- =====================================================================
create table audit_log (
  id            bigserial primary key,
  tenant_id     uuid references tenants(id) on delete set null,
  actor_id      uuid references user_profiles(id) on delete set null,
  actor_role    user_role,
  action        text not null,
  target_type   text,
  target_id     text,
  before_json   jsonb,
  after_json    jsonb,
  ip            inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index audit_log_tenant_time_idx on audit_log(tenant_id, created_at desc);

-- =====================================================================
-- updated_at trigger helper
-- =====================================================================
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
    execute format(
      'create trigger trg_%I_updated before update on %I
       for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- =====================================================================
-- New-user trigger: when Supabase Auth creates auth.users, create a profile.
-- =====================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
