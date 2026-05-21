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

  // 3. (Optional) Invite the Tenant Admin. Best-effort: log + continue on failure.
  if (admin_email) {
    await inviteTenantAdmin({
      tenantId: tenant.id,
      email: admin_email,
      fullName: admin_name,
      tenantName: name,
    }).catch((err) => {
      console.error("[tenant-invite] failed:", err);
    });
  }

  revalidatePath("/admin/tenants");
  redirect("/admin/tenants");
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
  redirect("/admin/tenants");
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
