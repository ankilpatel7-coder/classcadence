// Neon Auth (Better Auth) HTTP handler. Proxies all /api/auth/* requests
// (sign-in, sign-out, session, magic-link callback, etc.) to the Neon Auth
// service. Replaces the old Supabase /auth/callback PKCE route.
import { toNextJsHandler } from "@neondatabase/neon-auth-next";

export const { GET, POST } = toNextJsHandler(process.env.NEON_AUTH_BASE_URL!);
