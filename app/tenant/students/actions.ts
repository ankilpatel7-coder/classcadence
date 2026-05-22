"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { materializeSessions } from "@/app/tenant/today/actions";

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

const StudentSchemaCore = z.object({
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
  primary_parent_name: z.string().trim().min(2, "Parent name is required.").max(120),
  primary_email: emptyToNull(z.string().trim().toLowerCase().optional()),
  primary_phone: emptyToNull(z.string().trim().optional()),
  secondary_parent_name: emptyToNull(z.string().trim().optional()),
  secondary_email: emptyToNull(z.string().trim().toLowerCase().optional()),
  secondary_phone: emptyToNull(z.string().trim().optional()),
  mailing_address: emptyToNull(z.string().trim().optional()),
  notify_email: z.string().optional(),
  notify_whatsapp: z.string().optional(),
});

const CreateStudentSchema = StudentSchemaCore.refine(
  (v) => Boolean(v.primary_email) || Boolean(v.primary_phone),
  {
    message: "Provide at least a primary email or phone.",
    path: ["primary_email"],
  }
);
const UpdateStudentSchema = StudentSchemaCore.extend({
  id: z.string().uuid(),
}).refine(
  (v) => Boolean(v.primary_email) || Boolean(v.primary_phone),
  {
    message: "Provide at least a primary email or phone.",
    path: ["primary_email"],
  }
);

export type StudentState = {
  error: string | null;
  fieldErrors: Record<string, string>;
};

function notifyPrefsFrom(notify_email?: string, notify_whatsapp?: string) {
  return {
    email: notify_email === "on" || notify_email === "true",
    whatsapp: notify_whatsapp === "on" || notify_whatsapp === "true",
  };
}

export async function createStudentAction(
  _prev: StudentState,
  formData: FormData
): Promise<StudentState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role) || !user.tenantId) {
    return { error: "Not allowed.", fieldErrors: {} };
  }

  const parsed = CreateStudentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      error: "Fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const { notify_email, notify_whatsapp, ...rest } = parsed.data;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("students")
    .insert({
      ...rest,
      tenant_id: user.tenantId,
      notification_prefs_json: notifyPrefsFrom(notify_email, notify_whatsapp),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Insert failed.", fieldErrors: {} };
  }

  revalidatePath("/tenant/students");
  redirect(`/tenant/students/${data.id}/edit?created=1`);
}

export async function updateStudentAction(
  _prev: StudentState,
  formData: FormData
): Promise<StudentState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) return { error: "Not allowed.", fieldErrors: {} };

  const parsed = UpdateStudentSchema.safeParse({
    ...formDataToObject(formData),
    id: formData.get("id"),
  });
  if (!parsed.success) {
    return {
      error: "Fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const { id, notify_email, notify_whatsapp, ...updates } = parsed.data;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("students")
    .update({
      ...updates,
      notification_prefs_json: notifyPrefsFrom(notify_email, notify_whatsapp),
    })
    .eq("id", id);
  if (error) return { error: error.message, fieldErrors: {} };

  revalidatePath("/tenant/students");
  revalidatePath(`/tenant/students/${id}/edit`);
  redirect(`/tenant/students/${id}/edit?saved=1`);
}

export async function deleteStudentAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) redirect("/tenant/students?error=forbidden");
  const id = formData.get("id");
  if (typeof id !== "string") redirect("/tenant/students?error=invalid-id");
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) redirect(`/tenant/students?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/tenant/students");
  redirect("/tenant/students?deleted=1");
}

function formDataToObject(fd: FormData): Record<string, unknown> {
  return {
    location_id: fd.get("location_id"),
    first_name: fd.get("first_name"),
    last_name: fd.get("last_name"),
    dob: fd.get("dob"),
    grade_level: fd.get("grade_level"),
    lifecycle_status: fd.get("lifecycle_status") || "active",
    internal_notes: fd.get("internal_notes"),
    primary_parent_name: fd.get("primary_parent_name"),
    primary_email: fd.get("primary_email"),
    primary_phone: fd.get("primary_phone"),
    secondary_parent_name: fd.get("secondary_parent_name"),
    secondary_email: fd.get("secondary_email"),
    secondary_phone: fd.get("secondary_phone"),
    mailing_address: fd.get("mailing_address"),
    notify_email: fd.get("notify_email"),
    notify_whatsapp: fd.get("notify_whatsapp"),
  };
}

// ============ Enrollments (re-export from old location) ============

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

  // Per-location quota enforcement (BA: configurable max classes/student/week).
  const { data: slot } = await supabase
    .from("time_slots")
    .select(
      "id, classrooms!inner(locations!inner(id, max_classes_per_student_per_week))"
    )
    .eq("id", parsed.data.time_slot_id)
    .maybeSingle();
  type SlotRow = {
    classrooms: { locations: { id: string; max_classes_per_student_per_week: number } };
  };
  const slotRow = slot as unknown as SlotRow | null;
  if (slotRow) {
    const locId = slotRow.classrooms.locations.id;
    const cap = slotRow.classrooms.locations.max_classes_per_student_per_week;
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("enrollments")
      .select(
        "id, effective_to, time_slots!inner(classrooms!inner(locations!inner(id)))"
      )
      .eq("student_id", parsed.data.student_id)
      .or(`effective_to.is.null,effective_to.gte.${today}`);

    type Existing = {
      id: string;
      effective_to: string | null;
      time_slots: { classrooms: { locations: { id: string } } };
    };
    const existingAtLocation = (
      (existing ?? []) as unknown as Existing[]
    ).filter((e) => e.time_slots.classrooms.locations.id === locId);

    if (existingAtLocation.length >= cap) {
      return {
        error:
          `This student is already enrolled in ${existingAtLocation.length} active ` +
          `class${existingAtLocation.length === 1 ? "" : "es"} at this location. ` +
          `The location's cap is ${cap}/week. Raise the cap on the Location page or ` +
          `end an existing enrollment first.`,
        success: false,
      };
    }
  }

  const { error } = await supabase.from("enrollments").insert(parsed.data);
  if (error) return { error: error.message, success: false };

  // Auto-materialize so the student instantly appears on Today + Schedule
  // for the next 14 days of this recurring slot. Idempotent — safe to re-run.
  await materializeSessions(14).catch(() => {
    /* materialization is best-effort here; manual button in Settings covers gaps */
  });

  return { error: null, success: true };
}

export async function endEnrollmentAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) redirect("/tenant/students");

  const id = formData.get("id");
  const studentId = formData.get("student_id");
  if (typeof id !== "string" || typeof studentId !== "string") {
    redirect("/tenant/students?error=invalid-id");
  }

  const today = new Date().toISOString().slice(0, 10);
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("enrollments")
    .update({ effective_to: today })
    .eq("id", id);
  if (error) {
    redirect(
      `/tenant/students/${studentId}/edit?error=${encodeURIComponent(error.message)}`
    );
  }
  revalidatePath(`/tenant/students/${studentId}/edit`);
  redirect(`/tenant/students/${studentId}/edit?ended=1`);
}
