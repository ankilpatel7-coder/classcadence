"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

function emptyToNull<T extends z.ZodTypeAny>(schema: T) {
  return schema.transform((v) => (typeof v === "string" && v.length > 0 ? v : null));
}

function canWrite(role: string | null | undefined) {
  return (
    role === "tenant_admin" ||
    role === "location_admin" ||
    role === "front_desk" ||
    role === "super_admin"
  );
}

function collectFieldErrors(zErr: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of zErr.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

// ============ Households (BA 8.14) ============

const HouseholdCore = {
  primary_parent_name: z.string().trim().min(2, "Name is required."),
  primary_email: emptyToNull(z.string().trim().toLowerCase().optional()),
  primary_phone: emptyToNull(z.string().trim().optional()),
  secondary_parent_name: emptyToNull(z.string().trim().optional()),
  secondary_email: emptyToNull(z.string().trim().toLowerCase().optional()),
  secondary_phone: emptyToNull(z.string().trim().optional()),
  mailing_address: emptyToNull(z.string().trim().optional()),
  notify_email: z.string().optional(),
  notify_whatsapp: z.string().optional(),
};

const CreateHouseholdSchema = z.object(HouseholdCore).refine(
  (v) => Boolean(v.primary_email) || Boolean(v.primary_phone),
  { message: "Provide at least a primary email or phone.", path: ["primary_email"] }
);
const UpdateHouseholdSchema = z
  .object({ id: z.string().uuid(), ...HouseholdCore })
  .refine(
    (v) => Boolean(v.primary_email) || Boolean(v.primary_phone),
    { message: "Provide at least a primary email or phone.", path: ["primary_email"] }
  );

export type HouseholdState = {
  error: string | null;
  fieldErrors: Record<string, string>;
};

function buildNotificationPrefs(notify_email?: string, notify_whatsapp?: string) {
  return {
    email: notify_email === "on" || notify_email === "true",
    whatsapp: notify_whatsapp === "on" || notify_whatsapp === "true",
  };
}

export async function createHouseholdAction(
  _prev: HouseholdState,
  formData: FormData
): Promise<HouseholdState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role) || !user.tenantId) {
    return { error: "Not allowed.", fieldErrors: {} };
  }

  const parsed = CreateHouseholdSchema.safeParse({
    primary_parent_name: formData.get("primary_parent_name"),
    primary_email: formData.get("primary_email"),
    primary_phone: formData.get("primary_phone"),
    secondary_parent_name: formData.get("secondary_parent_name"),
    secondary_email: formData.get("secondary_email"),
    secondary_phone: formData.get("secondary_phone"),
    mailing_address: formData.get("mailing_address"),
    notify_email: formData.get("notify_email"),
    notify_whatsapp: formData.get("notify_whatsapp"),
  });
  if (!parsed.success) {
    return {
      error: "Fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const supabase = createSupabaseServerClient();
  const { notify_email, notify_whatsapp, ...rest } = parsed.data;
  const notification_prefs_json = buildNotificationPrefs(notify_email, notify_whatsapp);

  const { data, error } = await supabase
    .from("households")
    .insert({ ...rest, tenant_id: user.tenantId, notification_prefs_json })
    .select("id")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Insert failed.", fieldErrors: {} };
  }

  revalidatePath("/tenant/households");
  redirect(`/tenant/households/${data.id}/edit?created=1`);
}

export async function updateHouseholdAction(
  _prev: HouseholdState,
  formData: FormData
): Promise<HouseholdState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) return { error: "Not allowed.", fieldErrors: {} };

  const parsed = UpdateHouseholdSchema.safeParse({
    id: formData.get("id"),
    primary_parent_name: formData.get("primary_parent_name"),
    primary_email: formData.get("primary_email"),
    primary_phone: formData.get("primary_phone"),
    secondary_parent_name: formData.get("secondary_parent_name"),
    secondary_email: formData.get("secondary_email"),
    secondary_phone: formData.get("secondary_phone"),
    mailing_address: formData.get("mailing_address"),
    notify_email: formData.get("notify_email"),
    notify_whatsapp: formData.get("notify_whatsapp"),
  });
  if (!parsed.success) {
    return {
      error: "Fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const supabase = createSupabaseServerClient();
  const { id, notify_email, notify_whatsapp, ...updates } = parsed.data;
  const notification_prefs_json = buildNotificationPrefs(notify_email, notify_whatsapp);

  const { error } = await supabase
    .from("households")
    .update({ ...updates, notification_prefs_json })
    .eq("id", id);
  if (error) return { error: error.message, fieldErrors: {} };

  revalidatePath("/tenant/households");
  revalidatePath(`/tenant/households/${id}/edit`);
  redirect(`/tenant/households/${id}/edit?saved=1`);
}

export async function deleteHouseholdAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) redirect("/tenant/households?error=forbidden");
  const id = formData.get("id");
  if (typeof id !== "string") redirect("/tenant/households?error=invalid-id");
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("households").delete().eq("id", id);
  if (error) redirect(`/tenant/households?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/tenant/households");
  redirect("/tenant/households?deleted=1");
}

// ============ Students (BA 8.6 / 8.15) ============

const StudentCore = {
  household_id: z.string().uuid(),
  location_id: z.string().uuid(),
  first_name: z.string().trim().min(1, "First name is required.").max(80),
  last_name: z.string().trim().min(1, "Last name is required.").max(80),
  dob: emptyToNull(z.string().trim().optional()),
  grade_level: emptyToNull(z.string().trim().max(40).optional()),
  lifecycle_status: z.enum([
    "lead",
    "trial",
    "active",
    "waitlist",
    "inactive",
    "withdrawn",
  ]),
  internal_notes: emptyToNull(z.string().trim().max(2000).optional()),
};

const CreateStudentSchema = z.object(StudentCore);
const UpdateStudentSchema = z.object({ id: z.string().uuid(), ...StudentCore });

export type StudentState = {
  error: string | null;
  fieldErrors: Record<string, string>;
};

export async function createStudentAction(
  _prev: StudentState,
  formData: FormData
): Promise<StudentState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role) || !user.tenantId) {
    return { error: "Not allowed.", fieldErrors: {} };
  }

  const parsed = CreateStudentSchema.safeParse({
    household_id: formData.get("household_id"),
    location_id: formData.get("location_id"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    dob: formData.get("dob"),
    grade_level: formData.get("grade_level"),
    lifecycle_status: formData.get("lifecycle_status") || "active",
    internal_notes: formData.get("internal_notes"),
  });
  if (!parsed.success) {
    return { error: "Fix the errors below.", fieldErrors: collectFieldErrors(parsed.error) };
  }

  const supabase = createSupabaseServerClient();
  const { household_id } = parsed.data;
  const { data, error } = await supabase
    .from("students")
    .insert({ ...parsed.data, tenant_id: user.tenantId })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed.", fieldErrors: {} };

  revalidatePath(`/tenant/households/${household_id}/edit`);
  redirect(
    `/tenant/households/${household_id}/students/${data.id}/edit?created=1`
  );
}

export async function updateStudentAction(
  _prev: StudentState,
  formData: FormData
): Promise<StudentState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) return { error: "Not allowed.", fieldErrors: {} };

  const parsed = UpdateStudentSchema.safeParse({
    id: formData.get("id"),
    household_id: formData.get("household_id"),
    location_id: formData.get("location_id"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    dob: formData.get("dob"),
    grade_level: formData.get("grade_level"),
    lifecycle_status: formData.get("lifecycle_status"),
    internal_notes: formData.get("internal_notes"),
  });
  if (!parsed.success) {
    return { error: "Fix the errors below.", fieldErrors: collectFieldErrors(parsed.error) };
  }

  const supabase = createSupabaseServerClient();
  const { id, ...updates } = parsed.data;
  const { error } = await supabase.from("students").update(updates).eq("id", id);
  if (error) return { error: error.message, fieldErrors: {} };

  revalidatePath(`/tenant/households/${updates.household_id}/edit`);
  revalidatePath(`/tenant/households/${updates.household_id}/students/${id}/edit`);
  redirect(
    `/tenant/households/${updates.household_id}/students/${id}/edit?saved=1`
  );
}

export async function deleteStudentAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) redirect("/tenant/households?error=forbidden");
  const id = formData.get("id");
  const householdId = formData.get("household_id");
  if (typeof id !== "string" || typeof householdId !== "string") {
    redirect("/tenant/households?error=invalid-id");
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) {
    redirect(
      `/tenant/households/${householdId}/edit?error=${encodeURIComponent(error.message)}`
    );
  }
  revalidatePath(`/tenant/households/${householdId}/edit`);
  redirect(`/tenant/households/${householdId}/edit?student_deleted=1`);
}

// ============ Enrollments (BA 8.7) ============

const EnrollSchema = z.object({
  student_id: z.string().uuid(),
  time_slot_id: z.string().uuid(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date."),
});

export type EnrollState = { error: string | null; success: boolean };

export async function enrollStudentAction(
  _prev: EnrollState,
  formData: FormData
): Promise<EnrollState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) return { error: "Not allowed.", success: false };

  const parsed = EnrollSchema.safeParse({
    student_id: formData.get("student_id"),
    time_slot_id: formData.get("time_slot_id"),
    effective_from: formData.get("effective_from"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("enrollments").insert(parsed.data);
  if (error) return { error: error.message, success: false };

  return { error: null, success: true };
}

export async function endEnrollmentAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) redirect("/tenant/households");

  const id = formData.get("id");
  const householdId = formData.get("household_id");
  const studentId = formData.get("student_id");
  if (typeof id !== "string" || typeof householdId !== "string" || typeof studentId !== "string") {
    redirect("/tenant/households?error=invalid-id");
  }

  const today = new Date().toISOString().slice(0, 10);
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("enrollments")
    .update({ effective_to: today })
    .eq("id", id);
  if (error) {
    redirect(
      `/tenant/households/${householdId}/students/${studentId}/edit?error=${encodeURIComponent(error.message)}`
    );
  }
  revalidatePath(
    `/tenant/households/${householdId}/students/${studentId}/edit`
  );
  redirect(
    `/tenant/households/${householdId}/students/${studentId}/edit?ended=1`
  );
}
