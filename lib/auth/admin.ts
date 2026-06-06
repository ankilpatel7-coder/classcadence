import "server-only";
import { randomBytes, scryptSync } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Admin-side user management for Neon Auth (Better Auth). Replaces the
// Supabase service-role admin API (createUser / deleteUser / inviteUserByEmail).
//
// We create users through the open sign-up endpoint server-side (no Better
// Auth admin privileges required) and delete by removing the neon_auth rows
// directly via the owner DB connection. The session cookie the endpoint sets
// is discarded — this is a server fetch, so the admin's own session is
// unaffected.

const BASE_URL = process.env.NEON_AUTH_BASE_URL!;

export type CreateUserResult =
  | { ok: true; id: string }
  | { ok: false; error: string; code?: string };

export async function createNeonAuthUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<CreateUserResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/sign-up/email`, {
      method: "POST",
      // A trusted Origin header is required on direct server-to-service
      // sign-up calls. Must be an allowed origin in Neon Auth config.
      headers: {
        "content-type": "application/json",
        origin: process.env.NEXT_PUBLIC_APP_URL || "https://tryclasscadence.com",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network error" };
  }

  const data = (await res.json().catch(() => null)) as
    | { user?: { id?: string }; code?: string; message?: string }
    | null;

  if (!res.ok) {
    return {
      ok: false,
      error: data?.message ?? data?.code ?? "Failed to create user.",
      code: data?.code,
    };
  }
  const id = data?.user?.id;
  if (!id) return { ok: false, error: "Account creation returned no user id." };
  return { ok: true, id };
}

// Remove a Neon Auth user and its sessions/accounts. user_profiles has no FK
// to neon_auth (the id is just the shared uuid), so callers delete the profile
// row separately.
export async function deleteNeonAuthUser(userId: string): Promise<void> {
  await db.execute(sql`delete from neon_auth.session where "userId" = ${userId}`);
  await db.execute(sql`delete from neon_auth.account where "userId" = ${userId}`);
  await db.execute(sql`delete from neon_auth."user" where id = ${userId}`);
}

// Strong, readable temp password (no ambiguous chars). ~96 bits of entropy.
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  // Guarantee a digit + symbol so it always satisfies common policies.
  return `${out.slice(0, 8)}-${out.slice(8)}7`;
}

// Better Auth's credential hash, reproduced exactly with node's scrypt so we can
// set passwords server-side without a network round-trip to the auth service.
// Format: `${saltHex}:${keyHex}` (16-byte salt, 64-byte key). Params and the
// "salt-as-hex-string" input mirror better-auth/crypto's hashPassword — verified
// to reproduce live hashes byte-for-byte. If Neon Auth ever changes its hashing,
// these must be kept in sync (see node_modules/better-auth/dist/crypto/password).
const SCRYPT = { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 } as const;

export function hashNeonAuthPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password.normalize("NFKC"), salt, 64, SCRYPT).toString("hex");
  return `${salt}:${key}`;
}

// Set (or reset) the credential password for a user, keyed by their existing
// profile id. Idempotent and robust to the migration state where a profile has
// NO neon_auth account yet: it ensures the auth `user` row exists (bound to the
// same id as user_profiles, so all authored data stays linked) and replaces the
// credential `account` row. Returns a friendly error on failure (e.g. the email
// is already claimed by a different login).
//
// NB: neon-http has no interactive transactions, so these run as sequential
// statements — same trade-off as deleteNeonAuthUser above; the inconsistency
// window is negligible for an admin action.
export async function setUserPassword(opts: {
  userId: string;
  email: string;
  name: string;
  password: string;
}): Promise<CreateUserResult> {
  const hash = hashNeonAuthPassword(opts.password);
  try {
    // 1. Ensure the Better Auth user row exists for this id. We do NOT touch the
    //    email on conflict (avoids stealing an address from another login).
    await db.execute(sql`
      insert into neon_auth."user" (id, name, email, "emailVerified", role, banned, "createdAt", "updatedAt")
      values (${opts.userId}, ${opts.name}, ${opts.email}, false, 'user', false, now(), now())
      on conflict (id) do update set "updatedAt" = now()
    `);
    // 2. Replace the credential account (delete+insert avoids depending on
    //    rowCount, which neon-http does not reliably surface). Sessions and
    //    OAuth accounts reference the user, not this row, so this is safe.
    await db.execute(
      sql`delete from neon_auth.account where "userId" = ${opts.userId} and "providerId" = 'credential'`
    );
    await db.execute(sql`
      insert into neon_auth.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      values (gen_random_uuid(), ${opts.userId}, 'credential', ${opts.userId}, ${hash}, now(), now())
    `);
    return { ok: true, id: opts.userId };
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Failed to set password.";
    if (/user_email_key|duplicate key/i.test(raw)) {
      return {
        ok: false,
        error: "That email is already attached to a different login account.",
      };
    }
    return { ok: false, error: raw };
  }
}
