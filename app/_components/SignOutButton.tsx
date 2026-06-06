"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

// Client-side sign-out: the Neon Auth (Better Auth) client clears the session
// cookie in the browser, then we route back to /login.
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleSignOut} className={className}>
      Sign out
    </button>
  );
}
