"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, brandingAssets, userProfiles } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  createNeonAuthUser,
  deleteNeonAuthUser,
  generateTempPassword,
} from "@/lib/auth/admin";

// Every action here is reachable only from the super_admin-guarded /admin
// area, but we re-check defensively.
async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return null;
  return user;
}

const CreateTenantSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  legal_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  default_iana_tz: z.string().trim().min(3, "Timezone is required."),
  country: z
    .string()
    .trim()
    .length(2, "Use a 2-letter country code (e.g. US).")
    .transform((v) => v.toUpperCase()),
  admin_email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  admin_name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type CreateTenantState = {
  error: string | null;
  fieldErrors: Partial<Record<keyof z.infer<typeof CreateTenantSchema>, string>>;
};

const emptyFieldErrors: CreateTenantState["fieldErrors"] = {};

export async function createTenantAction(
  _prev: CreateTenantState,
  formData: FormData
): Promise<CreateTenantState> {
  const user = await requireSuperAdmin();
  if (!user) {
    return { error: "You must be signed in.", fieldErrors: emptyFieldErrors };
  }

  const parsed = CreateTenantSchema.safeParse({
    name: formData.get("name"),
    legal_name: formData.get("legal_name"),
    default_iana_tz: formData.get("default_iana_tz"),
    country: formData.get("country"),
    admin_email: formData.get("admin_email"),
    admin_name: formData.get("admin_name"),
  });

  if (!parsed.success) {
    const fieldErrors: CreateTenantState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CreateTenantState["fieldErrors"];
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Fix the errors below and try again.", fieldErrors };
  }

  const { name, legal_name, default_iana_tz, country, admin_email, admin_name } =
    parsed.data;

  let tenantId: string;
  try {
    const [row] = await db
      .insert(tenants)
      .values({ name, legalName: legal_name, defaultIanaTz: default_iana_tz, country })
      .returning({ id: tenants.id });
    tenantId = row.id;
    // Provision the branding_assets row (BA 8.19 — 0..1 per tenant).
    await db.insert(brandingAssets).values({ tenantId });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create tenant.",
      fieldErrors: emptyFieldErrors,
    };
  }

  // (Optional) Invite the Tenant Admin.
  let inviteError: string | null = null;
  if (admin_email) {
    try {
      await inviteTenantAdmin({
        tenantId,
        email: admin_email,
        fullName: admin_name,
        tenantName: name,
      });
    } catch (err) {
      console.error("[tenant-invite] failed:", err);
      inviteError = friendlyInviteError(err);
    }
  }

  revalidatePath("/admin/tenants");

  if (admin_email) {
    const qs = inviteError ? `?invite_error=${encodeURIComponent(inviteError)}` : "";
    redirect(`/admin/tenants/${tenantId}/edit${qs}`);
  }

  redirect("/admin/tenants");
}

function friendlyInviteError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/already.*exists|already.*registered/i.test(raw)) {
    return (
      "A user with that email already exists. Pick a different email, or remove " +
      "the existing user first, then send a fresh invite."
    );
  }
  return `Invite failed: ${raw}`;
}

const UpdateTenantSchema = z.object({
  id: z.string().uuid("Invalid tenant id."),
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  legal_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  default_iana_tz: z.string().trim().min(3, "Timezone is required."),
  country: z
    .string()
    .trim()
    .length(2, "Use a 2-letter country code (e.g. US).")
    .transform((v) => v.toUpperCase()),
  status: z.enum(["active", "suspended"]),
});

export type UpdateTenantState = {
  error: string | null;
  fieldErrors: Partial<Record<keyof z.infer<typeof UpdateTenantSchema>, string>>;
  success?: boolean;
};

const emptyUpdateFieldErrors: UpdateTenantState["fieldErrors"] = {};

export async function updateTenantAction(
  _prev: UpdateTenantState,
  formData: FormData
): Promise<UpdateTenantState> {
  const user = await requireSuperAdmin();
  if (!user) {
    return { error: "You must be signed in.", fieldErrors: emptyUpdateFieldErrors };
  }

  const parsed = UpdateTenantSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    legal_name: formData.get("legal_name"),
    default_iana_tz: formData.get("default_iana_tz"),
    country: formData.get("country"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    const fieldErrors: UpdateTenantState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof UpdateTenantState["fieldErrors"];
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Fix the errors below and try again.", fieldErrors };
  }

  const { id, name, legal_name, default_iana_tz, country, status } = parsed.data;

  try {
    await db
      .update(tenants)
      .set({ name, legalName: legal_name, defaultIanaTz: default_iana_tz, country, status })
      .where(eq(tenants.id, id));
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Update failed.",
      fieldErrors: emptyUpdateFieldErrors,
    };
  }

  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${id}/edit`);
  return { error: null, fieldErrors: emptyUpdateFieldErrors, success: true };
}

const UpdateAdminSchema = z.object({
  admin_id: z.string().uuid("Invalid admin id."),
  tenant_id: z.string().uuid("Invalid tenant id."),
  full_name: z.string().trim().max(120),
});

export type UpdateAdminState = { error: string | null; success: boolean };

export async function updateAdminProfileAction(
  _prev: UpdateAdminState,
  formData: FormData
): Promise<UpdateAdminState> {
  const user = await requireSuperAdmin();
  if (!user) return { error: "Not signed in.", success: false };

  const parsed = UpdateAdminSchema.safeParse({
    admin_id: formData.get("admin_id"),
    tenant_id: formData.get("tenant_id"),
    full_name: formData.get("full_name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  try {
    await db
      .update(userProfiles)
      .set({ fullName: parsed.data.full_name || null })
      .where(
        and(
          eq(userProfiles.id, parsed.data.admin_id),
          eq(userProfiles.tenantId, parsed.data.tenant_id)
        )
      );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed.", success: false };
  }

  revalidatePath(`/admin/tenants/${parsed.data.tenant_id}/edit`);
  return { error: null, success: true };
}

export async function removeAdminAction(formData: FormData) {
  const user = await requireSuperAdmin();
  if (!user) redirect("/login");

  const adminId = formData.get("admin_id");
  const tenantId = formData.get("tenant_id");
  if (
    typeof adminId !== "string" ||
    typeof tenantId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(adminId) ||
    !/^[0-9a-f-]{36}$/i.test(tenantId)
  ) {
    redirect(`/admin/tenants/${tenantId ?? ""}/edit?error=invalid-id`);
  }

  const tenantIdStr = tenantId as string;
  const adminIdStr = adminId as string;

  // Verify the user really is an admin of this tenant before deleting.
  const [profile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(and(eq(userProfiles.id, adminIdStr), eq(userProfiles.tenantId, tenantIdStr)))
    .limit(1);

  if (!profile) {
    redirect(`/admin/tenants/${tenantIdStr}/edit?error=not-an-admin`);
  }

  try {
    await deleteNeonAuthUser(adminIdStr);
    await db.delete(userProfiles).where(eq(userProfiles.id, adminIdStr));
  } catch (err) {
    redirect(
      `/admin/tenants/${tenantIdStr}/edit?error=${encodeURIComponent(
        err instanceof Error ? err.message : "delete failed"
      )}`
    );
  }

  revalidatePath(`/admin/tenants/${tenantIdStr}/edit`);
  redirect(`/admin/tenants/${tenantIdStr}/edit?removed=1`);
}

const InviteAdminSchema = z.object({
  tenant_id: z.string().uuid("Invalid tenant id."),
  email: z.string().trim().email("Enter a valid email."),
  full_name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type InviteAdminState = {
  error: string | null;
  success: boolean;
  // The temp password is echoed back so the super admin can copy/share it even
  // if email delivery is unavailable.
  createdCredentials?: { email: string; password: string } | null;
};

const CreateAdminWithPasswordSchema = z.object({
  tenant_id: z.string().uuid("Invalid tenant id."),
  email: z.string().trim().email("Enter a valid email."),
  full_name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer."),
});

export async function createAdminWithPasswordAction(
  _prev: InviteAdminState,
  formData: FormData
): Promise<InviteAdminState> {
  const user = await requireSuperAdmin();
  if (!user) return { error: "Not signed in.", success: false };

  const parsed = CreateAdminWithPasswordSchema.safeParse({
    tenant_id: formData.get("tenant_id"),
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  const { tenant_id, email, full_name, password } = parsed.data;

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, tenant_id))
    .limit(1);
  if (!tenant) return { error: "Tenant not found.", success: false };

  const created = await createNeonAuthUser({ email, password, name: full_name ?? "" });
  if (!created.ok) return { error: friendlyInviteError(created.error), success: false };

  try {
    await upsertTenantAdminProfile(created.id, email, full_name ?? null, tenant_id);
  } catch (err) {
    await deleteNeonAuthUser(created.id).catch(() => {});
    return {
      error: `Account created but profile update failed: ${
        err instanceof Error ? err.message : "unknown error"
      }`,
      success: false,
    };
  }

  revalidatePath(`/admin/tenants/${tenant_id}/edit`);
  return { error: null, success: true, createdCredentials: { email, password } };
}

export async function inviteAdminAction(
  _prev: InviteAdminState,
  formData: FormData
): Promise<InviteAdminState> {
  const user = await requireSuperAdmin();
  if (!user) return { error: "Not signed in.", success: false };

  const parsed = InviteAdminSchema.safeParse({
    tenant_id: formData.get("tenant_id"),
    email: formData.get("email"),
    full_name: formData.get("full_name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, parsed.data.tenant_id))
    .limit(1);
  if (!tenant) return { error: "Tenant not found.", success: false };

  let tempPassword: string;
  try {
    tempPassword = await inviteTenantAdmin({
      tenantId: parsed.data.tenant_id,
      email: parsed.data.email,
      fullName: parsed.data.full_name,
      tenantName: tenant.name,
    });
  } catch (err) {
    return { error: friendlyInviteError(err), success: false };
  }

  revalidatePath(`/admin/tenants/${parsed.data.tenant_id}/edit`);
  return {
    error: null,
    success: true,
    createdCredentials: { email: parsed.data.email, password: tempPassword },
  };
}

export async function deleteTenantAction(formData: FormData) {
  const user = await requireSuperAdmin();
  if (!user) redirect("/login");

  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    redirect("/admin/tenants?error=invalid-id");
  }

  try {
    await db.delete(tenants).where(eq(tenants.id, id as string));
  } catch (err) {
    redirect(
      `/admin/tenants?error=${encodeURIComponent(
        err instanceof Error ? err.message : "delete failed"
      )}`
    );
  }

  revalidatePath("/admin/tenants");
  redirect("/admin/tenants?deleted=1");
}

async function upsertTenantAdminProfile(
  id: string,
  email: string,
  fullName: string | null,
  tenantId: string
) {
  await db
    .insert(userProfiles)
    .values({ id, email, fullName, role: "tenant_admin", tenantId })
    .onConflictDoUpdate({
      target: userProfiles.id,
      set: { role: "tenant_admin", tenantId, fullName, email },
    });
}

// Create a tenant_admin with a generated temp password and email it via
// Resend. Returns the temp password so the caller can also surface it on
// screen (reliable fallback when email is unavailable).
async function inviteTenantAdmin(args: {
  tenantId: string;
  email: string;
  fullName: string | undefined;
  tenantName: string;
}): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const tempPassword = generateTempPassword();

  const created = await createNeonAuthUser({
    email: args.email,
    password: tempPassword,
    name: args.fullName ?? "",
  });
  if (!created.ok) throw new Error(created.error);

  try {
    await upsertTenantAdminProfile(
      created.id,
      args.email,
      args.fullName ?? null,
      args.tenantId
    );
  } catch (err) {
    await deleteNeonAuthUser(created.id).catch(() => {});
    throw err;
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromName = process.env.RESEND_FROM_NAME || "ClassCadence";
  if (resendKey && fromEmail) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: args.email,
      subject: `Welcome to ClassCadence — ${args.tenantName} is ready`,
      text:
        `Hi${args.fullName ? ` ${args.fullName}` : ""},\n\n` +
        `Your ClassCadence tenant "${args.tenantName}" has been created and you've ` +
        `been added as its admin.\n\n` +
        `Sign in at ${appUrl}/login with:\n` +
        `  Email: ${args.email}\n` +
        `  Temporary password: ${tempPassword}\n\n` +
        `Please change your password after your first sign-in ` +
        `(menu → Change password).\n\n` +
        `— ${fromName}`,
    });
  }

  return tempPassword;
}
