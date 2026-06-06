import "server-only";
import { randomBytes } from "node:crypto";
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
      headers: { "content-type": "application/json" },
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
