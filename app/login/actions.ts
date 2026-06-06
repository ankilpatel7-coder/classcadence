"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { postLoginPathForRole } from "@/lib/auth/post-login-redirect";

// Sign-in/sign-out now happen client-side via the Neon Auth (Better Auth)
// client, which manages session cookies in the browser. After a successful
// client sign-in, the form calls this to resolve where the user's role lands.
export async function resolvePostLoginPath(): Promise<string> {
  const user = await getCurrentUser();
  return postLoginPathForRole(user?.role ?? null);
}
