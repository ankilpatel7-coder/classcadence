import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { getServerSession } from "./session";
import type { AppRole } from "./post-login-redirect";

export type CurrentUser = {
  id: string;
  email: string;
  role: AppRole;
  tenantId: string | null;
  fullName: string | null;
};

// Resolve the current user (or null if not signed in). Memoized per-request
// via React.cache so layout + page in the same render pass pay for one Neon
// Auth getSession + user_profiles lookup, not two.
export const getCurrentUser = cache(
  async (): Promise<CurrentUser | null> => {
    const session = await getServerSession();
    if (!session?.user) return null;

    const [profile] = await db
      .select({
        role: userProfiles.role,
        tenantId: userProfiles.tenantId,
        fullName: userProfiles.fullName,
        email: userProfiles.email,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, session.user.id))
      .limit(1);

    return {
      id: session.user.id,
      email: profile?.email ?? session.user.email ?? "",
      role: (profile?.role ?? null) as AppRole,
      tenantId: profile?.tenantId ?? null,
      fullName: profile?.fullName ?? null,
    };
  }
);

// Same, but redirects to /login when there is no session. Use in protected
// layouts/pages where an unauthenticated user should never see the content.
export async function getCurrentUserOrRedirect(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
