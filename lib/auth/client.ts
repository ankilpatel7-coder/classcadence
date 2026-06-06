"use client";

// Browser auth client for Neon Auth (Better Auth).
//
// We do NOT use @neondatabase/neon-auth-next's createAuthClient() in the
// browser: it reads process.env.NEON_AUTH_BASE_URL, which Next.js does not
// expose client-side (not NEXT_PUBLIC_), so it throws on creation. Instead we
// post directly to our same-origin /api/auth/* handler (mounted by
// toNextJsHandler), which proxies to Neon Auth. Same-origin keeps the session
// cookie first-party on our domain.

type AuthResult<T = unknown> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
};

async function post<T = unknown>(path: string, body?: unknown): Promise<AuthResult<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body ?? {}),
    });
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : "Network error" } };
  }
  const data = (await res.json().catch(() => null)) as
    | (T & { code?: string; message?: string })
    | null;
  if (!res.ok) {
    return { data: null, error: { code: data?.code, message: data?.message } };
  }
  return { data: data as T, error: null };
}

export const authClient = {
  signIn: {
    email: (body: { email: string; password: string }) =>
      post("sign-in/email", body),
  },
  signOut: () => post("sign-out"),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    post("change-password", body),
};
