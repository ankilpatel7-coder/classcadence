"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

function ensureTenantAdmin(role: string | null | undefined) {
  if (role !== "tenant_admin" && role !== "super_admin") {
    redirect("/tenant?error=forbidden");
  }
}

const StaffRoles = ["front_desk", "location_admin"] as const;

const CreateStaffSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  full_name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  role: z.enum(StaffRoles),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer."),
});

export type CreateStaffState = {
  error: string | null;
  success: boolean;
  createdCredentials?: {
    email: string;
    password: string;
    role: string;
  } | null;
};

function friendly(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/already.*registered|user.*already.*exists/i.test(raw)) {
    return (
      "An auth user with that email already exists. Pick a different email " +
      "or have your platform admin delete the existing user in Supabase."
    );
  }
  return raw;
}

export async function createStaffAction(
  _prev: CreateStaffState,
  formData: FormData
): Promise<CreateStaffState> {
  const user = await getCurrentUserOrRedirect();
  ensureTenantAdmin(user.role);
  if (!user.tenantId) return { error: "No tenant context.", success: false };

  const parsed = CreateStaffSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      success: false,
    };
  }

  const { email, full_name, role, password } = parsed.data;
  const service = createSupabaseServiceClient();

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? "" },
  });
  if (error) return { error: friendly(error), success: false };

  const newUserId = data.user?.id;
  if (!newUserId) {
    return { error: "Account creation returned no user id.", success: false };
  }

  const { error: profileError } = await service
    .from("user_profiles")
    .update({
      role,
      tenant_id: user.tenantId,
      full_name: full_name ?? null,
    })
    .eq("id", newUserId);
  if (profileError) {
    return {
      error: `Account created but profile update failed: ${profileError.message}`,
      success: false,
    };
  }

  revalidatePath("/tenant/staff");
  return {
    error: null,
    success: true,
    createdCredentials: { email, password, role },
  };
}

export async function removeStaffAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  ensureTenantAdmin(user.role);
  if (!user.tenantId) redirect("/tenant?error=no-tenant");

  const staffId = formData.get("staff_id");
  if (typeof staffId !== "string") redirect("/tenant/staff?error=invalid-id");
  const staffIdStr = staffId as string;

  if (staffIdStr === user.id) {
    redirect(
      "/tenant/staff?error=" +
        encodeURIComponent("You can't remove your own account here.")
    );
  }

  const service = createSupabaseServiceClient();
  // Verify the target is in this tenant before deleting (defence in depth on
  // top of the form action).
  const { data: target } = await service
    .from("user_profiles")
    .select("id, tenant_id, role")
    .eq("id", staffIdStr)
    .maybeSingle();
  if (!target || target.tenant_id !== user.tenantId) {
    redirect("/tenant/staff?error=not-in-tenant");
  }
  if (target.role === "tenant_admin") {
    redirect(
      "/tenant/staff?error=" +
        encodeURIComponent(
          "Tenant Admins must be removed by your platform admin."
        )
    );
  }

  const { error } = await service.auth.admin.deleteUser(staffIdStr);
  if (error) {
    redirect("/tenant/staff?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/tenant/staff");
  redirect("/tenant/staff?removed=1");
}
