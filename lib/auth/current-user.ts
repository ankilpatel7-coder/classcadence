import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "./post-login-redirect";

export type CurrentUser = {
  id: string;
  email: string;
  role: AppRole;
  tenantId: string | null;
  fullName: string | null;
};

// Memoized per-request via React.cache so layout + page sharing the same
// render pass only pay for one supabase.auth.getUser + user_profiles lookup.
// Without this, each layout/page combo hits Supabase twice for the same data.
export const getCurrentUserOrRedirect = cache(
  async (): Promise<CurrentUser> => {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, tenant_id, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: profile?.email ?? user.email ?? "",
      role: (profile?.role ?? null) as AppRole,
      tenantId: profile?.tenant_id ?? null,
      fullName: profile?.full_name ?? null,
    };
  }
);
