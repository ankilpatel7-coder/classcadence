"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { createNeonAuthUser, deleteNeonAuthUser } from "@/lib/auth/admin";

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

function friendly(code: string | undefined, raw: string): string {
  if (code === "USER_ALREADY_EXISTS" || /already.*exists/i.test(raw)) {
    return "A user with that email already exists. Pick a different email.";
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

  const created = await createNeonAuthUser({
    email,
    password,
    name: full_name ?? "",
  });
  if (!created.ok) {
    return { error: friendly(created.code, created.error), success: false };
  }

  // No DB trigger creates the profile (unlike Supabase) — insert it here,
  // scoped to the acting admin's tenant.
  try {
    await db
      .insert(userProfiles)
      .values({
        id: created.id,
        email,
        fullName: full_name ?? null,
        role,
        tenantId: user.tenantId,
      })
      .onConflictDoUpdate({
        target: userProfiles.id,
        set: { role, tenantId: user.tenantId, fullName: full_name ?? null, email },
      });
  } catch (err) {
    // Roll back the auth user so a half-created account doesn't linger.
    await deleteNeonAuthUser(created.id).catch(() => {});
    return {
      error: `Account created but profile setup failed: ${
        err instanceof Error ? err.message : "unknown error"
      }`,
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

  // Verify the target is in this tenant before deleting (defence in depth).
  const [target] = await db
    .select({
      id: userProfiles.id,
      tenantId: userProfiles.tenantId,
      role: userProfiles.role,
    })
    .from(userProfiles)
    .where(eq(userProfiles.id, staffIdStr))
    .limit(1);

  if (!target || target.tenantId !== user.tenantId) {
    redirect("/tenant/staff?error=not-in-tenant");
  }
  if (target.role === "tenant_admin") {
    redirect(
      "/tenant/staff?error=" +
        encodeURIComponent("Tenant Admins must be removed by your platform admin.")
    );
  }

  try {
    await deleteNeonAuthUser(staffIdStr);
    await db.delete(userProfiles).where(eq(userProfiles.id, staffIdStr));
  } catch (err) {
    redirect(
      "/tenant/staff?error=" +
        encodeURIComponent(err instanceof Error ? err.message : "delete failed")
    );
  }

  revalidatePath("/tenant/staff");
  redirect("/tenant/staff?removed=1");
}
