// Server-side Supabase client.
// Use this in Server Components, Route Handlers, and Server Actions.
// Reads the user's session from cookies and enforces RLS via the auth context.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // No-op when called from a Server Component during render —
            // the middleware handles session refresh on those requests.
          }
        },
      },
    }
  );
}

// Service-role client. Bypasses RLS — use ONLY in trusted server contexts
// (cron jobs, admin actions, webhooks). Never expose to the browser.
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Service-role client unavailable."
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });
}
