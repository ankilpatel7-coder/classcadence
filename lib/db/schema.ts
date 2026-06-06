// =====================================================================
// ClassCadence — Drizzle schema (Neon Postgres)
// Faithful port of supabase/migrations/0001–0004. Pooled multi-tenant:
// every tenant-owned row carries tenant_id; RLS (see lib/db/rls.sql)
// enforces isolation via Neon Authorize (auth.user_id() from the JWT).
//
// Identity note: under Supabase, user_profiles.id and notifications.user_id
// FK'd to auth.users(id). Under Neon Auth (Stack), users live in
// neon_auth.users_sync (synced asynchronously), so we do NOT hard-FK to it
// here — the id is the Stack user id (uuid). The app upserts user_profiles
// on first sign-in / on admin user creation instead of via a DB trigger.
// =====================================================================
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  bigserial,
  timestamp,
  date,
  time,
  jsonb,
  inet,
  primaryKey,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// citext isn't a first-class Drizzle type; model as a custom text column.
// The actual column type is created as citext in the SQL migration.
import { customType } from "drizzle-orm/pg-core";
const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

// =====================================================================
// Enums
// =====================================================================
export const userRole = pgEnum("user_role", [
  "super_admin",
  "tenant_admin",
  "location_admin",
  "front_desk",
]);
export const tenantStatus = pgEnum("tenant_status", ["active", "suspended"]);
export const locationStatus = pgEnum("location_status", ["active", "inactive"]);
export const classroomStatus = pgEnum("classroom_status", ["active", "inactive"]);
export const weekday = pgEnum("weekday", [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
]);
export const lifecycleStatus = pgEnum("lifecycle_status", [
  "lead",
  "trial",
  "active",
  "waitlist",
  "inactive",
  "withdrawn",
]);
export const attendanceStatus = pgEnum("attendance_status", [
  "expected",
  "present",
  "late",
  "absent",
  "excused",
  "made_up",
]);
export const makeupState = pgEnum("makeup_state", [
  "pending",
  "accepted",
  "declined",
  "expired",
]);
export const notifChannel = pgEnum("notif_channel", ["email", "whatsapp"]);
export const notifState = pgEnum("notif_state", [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
]);
export const noteVisibility = pgEnum("note_visibility", ["parent", "internal"]);

const now = sql`now()`;
const genUuid = sql`gen_random_uuid()`;

// =====================================================================
// Tenants + branding
// =====================================================================
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(genUuid),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  defaultIanaTz: text("default_iana_tz").notNull().default("America/New_York"),
  country: text("country").notNull().default("US"),
  currency: text("currency").notNull().default("USD"),
  status: tenantStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
});

export const brandingAssets = pgTable("branding_assets", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  logoUrl: text("logo_url"),
  primaryColorHex: text("primary_color_hex").default("#1E3A8A"),
  senderDisplayName: text("sender_display_name"),
  emailSignatureHtml: text("email_signature_html"),
  emailBannerUrl: text("email_banner_url"),
  whatsappDisplayName: text("whatsapp_display_name"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
});

// =====================================================================
// Users — id is the Stack (Neon Auth) user id. No hard FK to auth users.
// =====================================================================
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  email: citext("email").notNull().unique(),
  fullName: text("full_name"),
  phone: text("phone"),
  role: userRole("role").notNull().default("front_desk"),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
});

// =====================================================================
// Locations
// =====================================================================
export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().default(genUuid),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country").default("US"),
    ianaTimezone: text("iana_timezone").notNull(),
    phone: text("phone"),
    supportEmail: citext("support_email"),
    status: locationStatus("status").notNull().default("active"),
    // Added in 0003: per-location weekly class quota.
    maxClassesPerStudentPerWeek: integer("max_classes_per_student_per_week")
      .notNull()
      .default(2),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    quotaCheck: check(
      "locations_quota_check",
      sql`${t.maxClassesPerStudentPerWeek} >= 1 and ${t.maxClassesPerStudentPerWeek} <= 20`
    ),
  })
);

export const userLocations = pgTable(
  "user_locations",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    roleAtLocation: userRole("role_at_location").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.locationId] }),
  })
);

export const operatingHoursRules = pgTable(
  "operating_hours_rules",
  {
    id: uuid("id").primaryKey().default(genUuid),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    weekday: weekday("weekday").notNull(),
    openTime: time("open_time").notNull(),
    closeTime: time("close_time").notNull(),
  },
  (t) => ({
    timeCheck: check("ohr_time_check", sql`${t.closeTime} > ${t.openTime}`),
  })
);

export const holidayClosures = pgTable(
  "holiday_closures",
  {
    id: uuid("id").primaryKey().default(genUuid),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason"),
  },
  (t) => ({
    dateCheck: check("holiday_date_check", sql`${t.endDate} >= ${t.startDate}`),
  })
);

// =====================================================================
// Classrooms + time slots
// =====================================================================
export const classrooms = pgTable(
  "classrooms",
  {
    id: uuid("id").primaryKey().default(genUuid),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    defaultCapacity: integer("default_capacity").notNull().default(8),
    color: text("color").default("#1E3A8A"),
    status: classroomStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    capacityCheck: check("classrooms_capacity_check", sql`${t.defaultCapacity} > 0`),
  })
);

export const timeSlots = pgTable(
  "time_slots",
  {
    id: uuid("id").primaryKey().default(genUuid),
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    weekday: weekday("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    capacityOverride: integer("capacity_override"),
    notes: text("notes"),
    status: classroomStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    timeCheck: check("time_slots_time_check", sql`${t.endTime} > ${t.startTime}`),
    // Partial unique index (where status='active') — created in rls/extra SQL.
    noOverlap: index("time_slots_no_overlap").on(
      t.classroomId,
      t.weekday,
      t.startTime,
      t.endTime
    ),
  })
);

// =====================================================================
// Households + students
// =====================================================================
export const households = pgTable(
  "households",
  {
    id: uuid("id").primaryKey().default(genUuid),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    primaryParentName: text("primary_parent_name").notNull(),
    primaryEmail: citext("primary_email"),
    primaryPhone: text("primary_phone"),
    secondaryParentName: text("secondary_parent_name"),
    secondaryEmail: citext("secondary_email"),
    secondaryPhone: text("secondary_phone"),
    mailingAddress: text("mailing_address"),
    notificationPrefsJson: jsonb("notification_prefs_json")
      .notNull()
      .default(sql`'{"email":true,"whatsapp":true}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    contactCheck: check(
      "households_contact_check",
      sql`${t.primaryEmail} is not null or ${t.primaryPhone} is not null`
    ),
  })
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().default(genUuid),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    // Nullable as of 0003.
    householdId: uuid("household_id").references(() => households.id, {
      onDelete: "restrict",
    }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dob: date("dob"),
    gradeLevel: text("grade_level"),
    lifecycleStatus: lifecycleStatus("lifecycle_status").notNull().default("active"),
    trialStartDate: date("trial_start_date"),
    trialEndDate: date("trial_end_date"),
    photoUrl: text("photo_url"),
    internalNotes: text("internal_notes"),
    consentObtainedAt: timestamp("consent_obtained_at", { withTimezone: true }),
    consentMethod: text("consent_method"),
    consentByName: text("consent_by_name"),
    // Added in 0003 (student-centric parent info).
    primaryParentName: text("primary_parent_name"),
    primaryEmail: citext("primary_email"),
    primaryPhone: text("primary_phone"),
    secondaryParentName: text("secondary_parent_name"),
    secondaryEmail: citext("secondary_email"),
    secondaryPhone: text("secondary_phone"),
    mailingAddress: text("mailing_address"),
    notificationPrefsJson: jsonb("notification_prefs_json")
      .notNull()
      .default(sql`'{"email":true,"whatsapp":true}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    tenantLocationIdx: index("students_tenant_location_idx").on(
      t.tenantId,
      t.locationId
    ),
    householdIdx: index("students_household_idx").on(t.householdId),
    lifecycleIdx: index("students_lifecycle_idx").on(t.tenantId, t.lifecycleStatus),
    primaryEmailIdx: index("students_primary_email_idx").on(t.primaryEmail),
  })
);

export const studentStatusHistory = pgTable("student_status_history", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  fromStatus: lifecycleStatus("from_status"),
  toStatus: lifecycleStatus("to_status").notNull(),
  changedBy: uuid("changed_by").references(() => userProfiles.id),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().default(now),
  reason: text("reason"),
});

// =====================================================================
// Enrollments / waitlist / sessions / attendance
// =====================================================================
export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().default(genUuid),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    timeSlotId: uuid("time_slot_id")
      .notNull()
      .references(() => timeSlots.id, { onDelete: "restrict" }),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    studentIdx: index("enrollments_student_idx").on(t.studentId),
    slotIdx: index("enrollments_slot_idx").on(t.timeSlotId),
    rangeCheck: check(
      "enrollments_range_check",
      sql`${t.effectiveTo} is null or ${t.effectiveTo} >= ${t.effectiveFrom}`
    ),
  })
);

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: uuid("id").primaryKey().default(genUuid),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    timeSlotId: uuid("time_slot_id")
      .notNull()
      .references(() => timeSlots.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .default(now),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  },
  (t) => ({
    // Deferrable unique — applied in extra SQL.
    posUnique: unique("waitlist_entries_slot_position_key").on(
      t.timeSlotId,
      t.position
    ),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().default(genUuid),
    timeSlotId: uuid("time_slot_id")
      .notNull()
      .references(() => timeSlots.id, { onDelete: "cascade" }),
    scheduledStartUtc: timestamp("scheduled_start_utc", {
      withTimezone: true,
    }).notNull(),
    scheduledEndUtc: timestamp("scheduled_end_utc", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("open"),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    startIdx: index("sessions_start_idx").on(t.scheduledStartUtc),
    slotStartUnique: unique("sessions_slot_start_key").on(
      t.timeSlotId,
      t.scheduledStartUtc
    ),
    statusCheck: check(
      "sessions_status_check",
      sql`${t.status} in ('open','closed','cancelled')`
    ),
  })
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().default(genUuid),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: attendanceStatus("status").notNull().default("expected"),
    checkInAt: timestamp("check_in_at", { withTimezone: true }),
    checkOutAt: timestamp("check_out_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds").generatedAlwaysAs(
      sql`case when check_in_at is not null and check_out_at is not null
               then extract(epoch from (check_out_at - check_in_at))::int
               else null end`
    ),
    notes: text("notes"),
    overrideBy: uuid("override_by").references(() => userProfiles.id),
    // Second FK to sessions — see [[attendance-sessions-embed]].
    madeUpInSessionId: uuid("made_up_in_session_id").references(() => sessions.id),
    excusedReason: text("excused_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    studentIdx: index("attendance_student_idx").on(t.studentId),
    sessionIdx: index("attendance_session_idx").on(t.sessionId),
    sessionStudentUnique: unique("attendance_session_student_key").on(
      t.sessionId,
      t.studentId
    ),
  })
);

export const makeupOffers = pgTable("makeup_offers", {
  id: uuid("id").primaryKey().default(genUuid),
  absentAttendanceId: uuid("absent_attendance_id")
    .notNull()
    .unique()
    .references(() => attendanceRecords.id, { onDelete: "cascade" }),
  offeredSessionId: uuid("offered_session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "restrict" }),
  state: makeupState("state").notNull().default("pending"),
  tokenHash: text("token_hash").notNull().unique(),
  offeredAt: timestamp("offered_at", { withTimezone: true }).notNull().default(now),
  offeredBy: uuid("offered_by").references(() => userProfiles.id),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const lessonNotes = pgTable("lesson_notes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  attendanceRecordId: uuid("attendance_record_id")
    .notNull()
    .references(() => attendanceRecords.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => userProfiles.id),
  visibility: noteVisibility("visibility").notNull().default("internal"),
  body: text("body").notNull(),
  templateKey: text("template_key"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
});

// =====================================================================
// Notifications + bulk messages
// =====================================================================
export const notificationEvents = pgTable(
  "notification_events",
  {
    id: uuid("id").primaryKey().default(genUuid),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    householdId: uuid("household_id").references(() => households.id, {
      onDelete: "set null",
    }),
    studentId: uuid("student_id").references(() => students.id, {
      onDelete: "set null",
    }),
    recipientEmail: citext("recipient_email"),
    recipientPhone: text("recipient_phone"),
    channel: notifChannel("channel").notNull(),
    templateKey: text("template_key").notNull(),
    payloadJson: jsonb("payload_json").notNull().default(sql`'{}'::jsonb`),
    state: notifState("state").notNull().default("queued"),
    providerId: text("provider_id"),
    dedupKey: text("dedup_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    stateIdx: index("notif_events_state_idx").on(t.state, t.createdAt),
    dedupUnique: unique("notif_events_dedup_key").on(
      t.tenantId,
      t.channel,
      t.dedupKey
    ),
  })
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    channel: notifChannel("channel").notNull(),
    optedIn: boolean("opted_in").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.householdId, t.channel] }),
  })
);

export const bulkMessages = pgTable("bulk_messages", {
  id: uuid("id").primaryKey().default(genUuid),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id, {
    onDelete: "cascade",
  }),
  senderId: uuid("sender_id").references(() => userProfiles.id),
  category: text("category").notNull(),
  channels: notifChannel("channels").array().notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  audienceQueryJson: jsonb("audience_query_json").notNull().default(sql`'{}'::jsonb`),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  recipientsTotal: integer("recipients_total").default(0),
  recipientsSuppressed: integer("recipients_suppressed").default(0),
  recipientsFailed: integer("recipients_failed").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
});

// In-app notifications (0004). user_id is the Stack user id (no auth.users FK).
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(genUuid),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    userUnreadIdx: index("notifications_user_unread_idx").on(
      t.userId,
      t.readAt,
      t.createdAt
    ),
    tenantCreatedIdx: index("notifications_tenant_created_idx").on(
      t.tenantId,
      t.createdAt
    ),
  })
);

// =====================================================================
// CSV imports / resources / iCal tokens / audit
// =====================================================================
export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").primaryKey().default(genUuid),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceCsvUrl: text("source_csv_url").notNull(),
    mappingJson: jsonb("mapping_json").notNull().default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("pending"),
    rowsTotal: integer("rows_total").default(0),
    rowsInserted: integer("rows_inserted").default(0),
    rowsSkipped: integer("rows_skipped").default(0),
    errorsJson: jsonb("errors_json").default(sql`'[]'::jsonb`),
    createdBy: uuid("created_by").references(() => userProfiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    statusCheck: check(
      "import_jobs_status_check",
      sql`${t.status} in ('pending','dry_run','committed','failed')`
    ),
  })
);

export const resourceFiles = pgTable("resource_files", {
  id: uuid("id").primaryKey().default(genUuid),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  mime: text("mime"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  uploadedBy: uuid("uploaded_by").references(() => userProfiles.id),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
});

export const calendarFeedTokens = pgTable("calendar_feed_tokens", {
  id: uuid("id").primaryKey().default(genUuid),
  userId: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    actorId: uuid("actor_id").references(() => userProfiles.id, {
      onDelete: "set null",
    }),
    actorRole: userRole("actor_role"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(now),
  },
  (t) => ({
    tenantTimeIdx: index("audit_log_tenant_time_idx").on(t.tenantId, t.createdAt),
  })
);
