"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

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
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  // 1. Insert tenant under RLS (super_admin policy permits this).
  const { data: tenant, error: insertError } = await supabase
    .from("tenants")
    .insert({ name, legal_name, default_iana_tz, country })
    .select("id")
    .single();

  if (insertError || !tenant) {
    return {
      error: insertError?.message ?? "Failed to create tenant.",
      fieldErrors: emptyFieldErrors,
    };
  }

  // 2. Provision the branding_assets row (BA 8.19 — 0..1 per tenant).
  const { error: brandingError } = await supabase
    .from("branding_assets")
    .insert({ tenant_id: tenant.id });

  if (brandingError) {
    return {
      error: `Tenant created but branding row failed: ${brandingError.message}`,
      fieldErrors: emptyFieldErrors,
    };
  }

  // 3. (Optional) Invite the Tenant Admin. Surface failures via query string so the
  //    operator can see what happened on the next page.
  let inviteError: string | null = null;
  if (admin_email) {
    try {
      await inviteTenantAdmin({
        tenantId: tenant.id,
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

  // If an admin email was provided, drop into the tenant edit page so the operator
  // can immediately see whether the admin was attached (and retry if not).
  if (admin_email) {
    const qs = inviteError
      ? `?invite_error=${encodeURIComponent(inviteError)}`
      : "";
    redirect(`/admin/tenants/${tenant.id}/edit${qs}`);
  }

  redirect("/admin/tenants");
}

function friendlyInviteError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/already.*registered|already.*been.*registered|user.*already.*exists/i.test(raw)) {
    return (
      "An auth user with that email already exists. Delete it under Supabase " +
      "→ Authentication → Users (or pick a different email), then use the " +
      "Invite form below to send a fresh invite."
    );
  }
  if (/redirect.*not.*allowed|not.*in.*allow.*list|invalid.*redirect/i.test(raw)) {
    return (
      "Supabase rejected the redirect URL. Add this app's URL to " +
      "Authentication → URL Configuration → Redirect URLs in Supabase."
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
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const { error: updateError } = await supabase
    .from("tenants")
    .update({ name, legal_name, default_iana_tz, country, status })
    .eq("id", id);

  if (updateError) {
    return {
      error: updateError.message,
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
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", success: false };

  const parsed = UpdateAdminSchema.safeParse({
    admin_id: formData.get("admin_id"),
    tenant_id: formData.get("tenant_id"),
    full_name: formData.get("full_name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  // Service role: super_admin RLS allows profile writes, but using service role
  // keeps tenant_id-scoped writes simple and consistent with invite flow.
  const service = createSupabaseServiceClient();
  const { error } = await service
    .from("user_profiles")
    .update({ full_name: parsed.data.full_name || null })
    .eq("id", parsed.data.admin_id)
    .eq("tenant_id", parsed.data.tenant_id);

  if (error) return { error: error.message, success: false };

  revalidatePath(`/admin/tenants/${parsed.data.tenant_id}/edit`);
  return { error: null, success: true };
}

export async function removeAdminAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from("user_profiles")
    .select("id")
    .eq("id", adminIdStr)
    .eq("tenant_id", tenantIdStr)
    .maybeSingle();

  if (!profile) {
    redirect(`/admin/tenants/${tenantIdStr}/edit?error=not-an-admin`);
  }

  // Deleting the auth user cascades to user_profiles via the FK on .id.
  const { error: deleteError } = await service.auth.admin.deleteUser(adminIdStr);
  if (deleteError) {
    redirect(
      `/admin/tenants/${tenantIdStr}/edit?error=${encodeURIComponent(deleteError.message)}`
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
  // For password-set mode, the action echoes back the credentials so the UI
  // can render them for the super admin to copy and share out-of-band.
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
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", success: false };

  const parsed = CreateAdminWithPasswordSchema.safeParse({
    tenant_id: formData.get("tenant_id"),
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      success: false,
    };
  }

  const { tenant_id, email, full_name, password } = parsed.data;

  const service = createSupabaseServiceClient();

  // Confirm the tenant exists (also gives us a nice 404-ish error if not).
  const { data: tenant } = await service
    .from("tenants")
    .select("id")
    .eq("id", tenant_id)
    .maybeSingle();
  if (!tenant) return { error: "Tenant not found.", success: false };

  // email_confirm: true marks the email as already verified so the new user
  // can sign in immediately without clicking a confirmation link.
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? "" },
  });

  if (error) {
    return {
      error: friendlyInviteError(error),
      success: false,
    };
  }

  const newUserId = data.user?.id;
  if (!newUserId) {
    return { error: "Account creation returned no user id.", success: false };
  }

  // Promote the freshly-created profile into tenant_admin for this tenant.
  const { error: profileError } = await service
    .from("user_profiles")
    .update({
      role: "tenant_admin",
      tenant_id,
      full_name: full_name ?? null,
    })
    .eq("id", newUserId);
  if (profileError) {
    return {
      error: `Account created but profile update failed: ${profileError.message}`,
      success: false,
    };
  }

  revalidatePath(`/admin/tenants/${tenant_id}/edit`);
  return {
    error: null,
    success: true,
    createdCredentials: { email, password },
  };
}

export async function inviteAdminAction(
  _prev: InviteAdminState,
  formData: FormData
): Promise<InviteAdminState> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", success: false };

  const parsed = InviteAdminSchema.safeParse({
    tenant_id: formData.get("tenant_id"),
    email: formData.get("email"),
    full_name: formData.get("full_name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  // Look up the tenant name for the welcome email body.
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", parsed.data.tenant_id)
    .maybeSingle();

  if (tenantError || !tenant) {
    return { error: "Tenant not found.", success: false };
  }

  try {
    await inviteTenantAdmin({
      tenantId: parsed.data.tenant_id,
      email: parsed.data.email,
      fullName: parsed.data.full_name,
      tenantName: tenant.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed.";
    return { error: message, success: false };
  }

  revalidatePath(`/admin/tenants/${parsed.data.tenant_id}/edit`);
  return { error: null, success: true };
}

export async function deleteTenantAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    redirect("/admin/tenants?error=invalid-id");
  }

  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) {
    redirect(`/admin/tenants?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/tenants");
  redirect("/admin/tenants?deleted=1");
}

async function inviteTenantAdmin(args: {
  tenantId: string;
  email: string;
  fullName: string | undefined;
  tenantName: string;
}) {
  const service = createSupabaseServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Send a Supabase-hosted invite (creates an auth.users row + magic link).
  // The on_auth_user_created trigger then creates a default user_profiles row.
  // The link lands on /auth/callback which exchanges the PKCE code and forwards
  // the user to /auth/setup so they can set their own password.
  const { data, error } = await service.auth.admin.inviteUserByEmail(args.email, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/setup`,
    data: { full_name: args.fullName ?? "" },
  });

  if (error) throw error;
  const newUserId = data.user?.id;
  if (!newUserId) throw new Error("Invite returned no user id.");

  // Promote the new profile into the tenant as tenant_admin (bypass RLS via service role).
  const { error: profileError } = await service
    .from("user_profiles")
    .update({
      role: "tenant_admin",
      tenant_id: args.tenantId,
      full_name: args.fullName ?? null,
    })
    .eq("id", newUserId);
  if (profileError) throw profileError;

  // Resend a branded welcome email if configured. Supabase already sent the invite
  // link, so this is purely a friendly heads-up.
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromName = process.env.RESEND_FROM_NAME || "ClassCadence";
  if (resendKey && fromEmail) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: args.email,
      subject: `Welcome to ClassCadence — ${args.tenantName} is ready to set up`,
      text:
        `Hi${args.fullName ? ` ${args.fullName}` : ""},\n\n` +
        `Your ClassCadence tenant "${args.tenantName}" has been created. ` +
        `Look for a separate email titled "You have been invited" from Supabase ` +
        `(check spam if you don't see it). Click "Accept Invitation" in that email — ` +
        `it lands on a page where you can set your password. ` +
        `After that, you can sign in any time at ${appUrl}/login.\n\n` +
        `— ${fromName}`,
    });
  }
}
