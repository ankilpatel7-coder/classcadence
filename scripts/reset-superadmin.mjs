// Reset the super_admin login: the Neon Auth account has no password
// (created via console without one). Recreate it through the sign-up endpoint
// (known-good hash) and remap the user id across all tables that reference it.
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import pg from "pg";

for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const OLD_ID = "7f4540e9-30a1-43c3-8eb7-a7f7cef8a1dd";
const EMAIL = "ankilpatel.business@gmail.com";
const NAME = "Ankil Patel";
const AUTH_BASE = process.env.NEON_AUTH_BASE_URL;

function pw() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const b = randomBytes(12);
  let s = "";
  for (let i = 0; i < b.length; i++) s += a[b[i] % a.length];
  return s.slice(0, 6) + "-" + s.slice(6) + "9";
}

// Every column that stores a user id (no FK constraints on these in Neon).
const REFS = [
  ["user_profiles", "id"],
  ["user_locations", "user_id"],
  ["notifications", "user_id"],
  ["student_status_history", "changed_by"],
  ["attendance_records", "override_by"],
  ["makeup_offers", "offered_by"],
  ["lesson_notes", "author_id"],
  ["bulk_messages", "sender_id"],
  ["import_jobs", "created_by"],
  ["resource_files", "uploaded_by"],
  ["calendar_feed_tokens", "user_id"],
  ["audit_log", "actor_id"],
];

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

// 1. Remove the broken passwordless auth rows.
await c.query('delete from neon_auth.session where "userId"=$1', [OLD_ID]);
await c.query('delete from neon_auth.account where "userId"=$1', [OLD_ID]);
await c.query('delete from neon_auth."user" where id=$1', [OLD_ID]);
console.log("Removed old passwordless account.");

// 2. Recreate via sign-up (produces a valid credential hash).
const password = pw();
const res = await fetch(`${AUTH_BASE}/sign-up/email`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: "http://localhost:3000" },
  body: JSON.stringify({ email: EMAIL, password, name: NAME }),
});
const body = await res.json().catch(() => null);
if (!res.ok) throw new Error("sign-up failed: " + JSON.stringify(body));
const NEW_ID = body.user.id;
console.log("Recreated account, new id:", NEW_ID);

// 3. Remap old id -> new id everywhere.
for (const [t, col] of REFS) {
  const r = await c.query(`update public.${t} set "${col}"=$1 where "${col}"=$2`, [NEW_ID, OLD_ID]);
  if (r.rowCount) console.log(`  remapped ${t}.${col}: ${r.rowCount}`);
}

await c.end();
console.log(`\nDONE. Super-admin login:\n  email: ${EMAIL}\n  password: ${password}`);
