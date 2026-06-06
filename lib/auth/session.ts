// Server-side session helpers for Neon Auth (Better Auth).
//
// The Better Auth *client* defaults to a relative base ("/api/auth/...") which
// has no origin on the server and throws ERR_INVALID_URL. So on the server we
// talk to the Neon Auth service directly with fetch, forwarding the request
// cookies. The session cookie (__Secure-neon-auth.session_token) is HttpOnly +
// Secure; we just pass the whole Cookie header through.
import { cache } from "react";
import { cookies } from "next/headers";

const BASE_URL = process.env.NEON_AUTH_BASE_URL!;

export type NeonSession = {
  user: { id: string; email: string; name: string; emailVerified: boolean };
  session: { id: string; userId: string; expiresAt: string; token: string };
} | null;

// Memoized per-request so a layout + page in the same render pass share one
// round-trip to the Neon Auth service (mirrors the old React.cache pattern).
export const getServerSession = cache(async (): Promise<NeonSession> => {
  const cookieHeader = cookies().toString();
  if (!cookieHeader) return null;

  const res = await fetch(`${BASE_URL}/get-session`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as NeonSession;
  return data?.user ? data : null;
});

// Mints a Neon Auth JWT for the current request (carries the user id as `sub`).
// Pass this to authedDb() if/when DB-level RLS (Neon Authorize) is enabled.
export async function getAuthToken(): Promise<string | null> {
  const cookieHeader = cookies().toString();
  if (!cookieHeader) return null;

  const res = await fetch(`${BASE_URL}/token`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { token?: string };
  return data?.token ?? null;
}
