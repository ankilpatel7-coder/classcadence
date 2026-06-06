// One-shot data migration: Supabase -> Neon.
// Copies all public business data, remapping the two user ids (Supabase auth
// ids -> Neon Auth ids) and recreating the tenant_admin in Neon Auth.
//
// Usage:
//   SUPA_URL="postgresql://...pooler.supabase.com:5432/postgres" node scripts/migrate-data.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPA_URL = process.env.SUPA_URL;
if (!SUPA_URL) throw new Error("Set SUPA_URL env var to the Supabase pooler connection string.");
const NEON_URL = process.env.DATABASE_URL;
const AUTH_BASE = process.env.NEON_AUTH_BASE_URL;

// Known users (from inspection).
const SUPER_OLD = "5cf75826-c556-443b-ac62-f8c1a71c0a91";
const SUPER_NEW = "7f4540e9-30a1-43c3-8eb7-a7f7cef8a1dd"; // already in Neon Auth
const NITI_OLD = "133b883e-27ba-40e6-99ea-718d9a17dbde";
const NITI_EMAIL = "niti21791@gmail.com";

// FK-safe insertion order.
const ORDER = [
  "tenants", "branding_assets", "user_profiles", "locations", "user_locations",
  "operating_hours_rules", "holiday_closures", "classrooms", "time_slots",
  "households", "students", "student_status_history", "enrollments",
  "waitlist_entries", "sessions", "attendance_records", "makeup_offers",
  "lesson_notes", "notification_events", "notification_preferences",
  "notifications", "bulk_messages", "import_jobs", "resource_files",
  "calendar_feed_tokens", "audit_log",
];

// Columns holding a user id (remapped). Missing-from-map -> null (or skip row
// for user_profiles, handled below).
const USER_COLS = {
  user_profiles: ["id"],
  user_locations: ["user_id"],
  notifications: ["user_id"],
  student_status_history: ["changed_by"],
  attendance_records: ["override_by"],
  makeup_offers: ["offered_by"],
  lesson_notes: ["author_id"],
  bulk_messages: ["sender_id"],
  import_jobs: ["created_by"],
  resource_files: ["uploaded_by"],
  calendar_feed_tokens: ["user_id"],
  audit_log: ["actor_id"],
};
const BIGSERIAL = new Set(["student_status_history", "lesson_notes", "audit_log"]);

function tempPassword() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 14; i++) s += a[Math.floor(Math.random() * a.length)];
  return s.slice(0, 7) + "-" + s.slice(7) + "9";
}

const supa = new pg.Client({ connectionString: SUPA_URL, ssl: { rejectUnauthorized: false } });
const neon = new pg.Client({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
await supa.connect();
await neon.connect();
console.log("Connected to both DBs.");

// 1) Recreate Niyati in Neon Auth (or reuse if already there).
let nitiNew = (
  await neon.query('select id from neon_auth."user" where lower(email)=lower($1)', [NITI_EMAIL])
).rows[0]?.id;
let nitiPassword = null;
if (!nitiNew) {
  nitiPassword = tempPassword();
  const res = await fetch(`${AUTH_BASE}/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({ email: NITI_EMAIL, password: nitiPassword, name: "Niyati Patel" }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error("Failed to create Niyati: " + JSON.stringify(body));
  nitiNew = body.user.id;
  console.log(`Created Niyati in Neon Auth: ${nitiNew} (temp password: ${nitiPassword})`);
} else {
  console.log(`Niyati already in Neon Auth: ${nitiNew}`);
}

const REMAP = new Map([
  [SUPER_OLD, SUPER_NEW],
  [NITI_OLD, nitiNew],
]);

// 2) Copy tables.
let totals = {};
for (const table of ORDER) {
  // Column list from Supabase, excluding generated columns.
  const cols = (
    await supa.query(
      `select column_name from information_schema.columns
       where table_schema='public' and table_name=$1
         and (is_generated is null or is_generated='NEVER')
       order by ordinal_position`,
      [table]
    )
  ).rows.map((r) => r.column_name);
  if (cols.length === 0) continue;

  const insertCols = BIGSERIAL.has(table) ? cols.filter((c) => c !== "id") : cols;
  const rows = (await supa.query(`select ${cols.map((c) => `"${c}"`).join(",")} from public.${table}`)).rows;
  if (rows.length === 0) { totals[table] = 0; continue; }

  const userCols = new Set(USER_COLS[table] ?? []);
  let inserted = 0;
  for (const row of rows) {
    // Remap user-id columns.
    let skip = false;
    for (const uc of userCols) {
      const v = row[uc];
      if (v == null) continue;
      if (REMAP.has(v)) row[uc] = REMAP.get(v);
      else if (uc === "id") skip = true; // unknown user_profiles row — shouldn't happen
      else row[uc] = null; // unknown user ref in a nullable audit col
    }
    if (skip) continue;

    const vals = insertCols.map((c) => row[c]);
    const ph = insertCols.map((_, i) => `$${i + 1}`).join(",");
    const sql = `insert into public.${table} (${insertCols.map((c) => `"${c}"`).join(",")})
                 values (${ph}) on conflict do nothing`;
    try {
      const r = await neon.query(sql, vals);
      inserted += r.rowCount;
    } catch (e) {
      console.error(`  ! ${table}: ${e.code} ${e.message}`);
    }
  }
  totals[table] = inserted;
  console.log(`  ${table}: ${inserted}/${rows.length}`);
}

// 3) Fix bigserial sequences.
for (const t of BIGSERIAL) {
  await neon.query(
    `select setval(pg_get_serial_sequence('public.${t}','id'), coalesce((select max(id) from public.${t}),1))`
  ).catch(() => {});
}

await supa.end();
await neon.end();
console.log("\nDONE.", JSON.stringify(totals));
if (nitiPassword) console.log(`\n>>> Niyati (niti21791@gmail.com) temp password: ${nitiPassword}`);
