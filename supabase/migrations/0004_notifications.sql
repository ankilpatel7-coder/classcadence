-- =====================================================================
-- ClassCadence — 0004: in-app notifications
-- =====================================================================
-- One row per (user, event). The notifications system fans out from a
-- single domain event (e.g. enrollment) to N user-scoped rows so each
-- recipient gets their own read_at state. Email is sent in parallel by
-- the same write path but lives outside this table.
-- =====================================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  -- Free-form per-type payload. Frontend renders the message from this
  -- so we can change copy without a migration.
  --   enrollment_confirmed: { student_name, classroom_name, weekday,
  --                           start_time, end_time, student_id }
  --   student_absent:       { student_name, classroom_name, time, date,
  --                           student_id }
  --   class_reminder:       { ...tbd }
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Fast "unread for me" + "recent for me" — single index covers both
-- via the (user_id, read_at, created_at desc) ordering.
create index if not exists notifications_user_unread_idx
  on notifications (user_id, read_at, created_at desc);

create index if not exists notifications_tenant_created_idx
  on notifications (tenant_id, created_at desc);

alter table notifications enable row level security;

-- Each user reads only their own rows.
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own"
  on notifications for select
  using (user_id = auth.uid());

-- Each user marks their own rows read (the only legal update from a
-- user-context client). Insert is service-role only — domain events
-- write through the notification helper which uses the service client.
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';
