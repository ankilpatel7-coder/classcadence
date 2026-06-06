// =====================================================================
// Drizzle connections for Neon.
//
// TWO modes, mirroring the old Supabase split:
//   • db          — OWNER connection. Bypasses RLS. The replacement for
//                   createSupabaseServiceClient(). Use ONLY in trusted
//                   server code (admin actions, cron, webhooks, the
//                   notification fan-out).
//   • authedDb()  — AUTHENTICATED connection. Runs as the `authenticated`
//                   role and passes the caller's Stack (Neon Auth) JWT, so
//                   Neon Authorize enforces the RLS policies in rls.sql.
//                   The replacement for createSupabaseServerClient().
//
// Env:
//   DATABASE_URL                — owner/role connection string (RLS-bypassing)
//   DATABASE_AUTHENTICATED_URL  — the `authenticated` role connection string
//                                 (from Neon Authorize setup)
// =====================================================================
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

// Owner connection — full access, RLS bypassed. Never expose to the browser.
export const db = drizzle(neon(process.env.DATABASE_URL), { schema });

// Authenticated connection — RLS enforced via the caller's JWT.
// `authToken` is the Stack-issued access token (JWT with `sub` = user id).
export function authedDb(authToken: string) {
  const url =
    process.env.DATABASE_AUTHENTICATED_URL ?? process.env.DATABASE_URL!;
  return drizzle(neon(url, { authToken }), { schema });
}

export { schema };
