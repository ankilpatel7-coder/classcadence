"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

function emptyToNull<T extends z.ZodTypeAny>(schema: T) {
  return schema.transform((v) => (typeof v === "string" && v.length > 0 ? v : null));
}

const LocationCoreSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  address_line1: emptyToNull(z.string().trim().max(200).optional()),
  address_line2: emptyToNull(z.string().trim().max(200).optional()),
  city: emptyToNull(z.string().trim().max(120).optional()),
  region: emptyToNull(z.string().trim().max(120).optional()),
  postal_code: emptyToNull(z.string().trim().max(40).optional()),
  country: z
    .string()
    .trim()
    .length(2, "Use a 2-letter country code (e.g. US).")
    .transform((v) => v.toUpperCase()),
  iana_timezone: z.string().trim().min(3, "Timezone is required."),
  phone: emptyToNull(z.string().trim().max(40).optional()),
  support_email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toLowerCase() : null))
    .refine(
      (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      { message: "Enter a valid email or leave blank." }
    ),
  max_classes_per_student_per_week: z.coerce
    .number()
    .int("Quota must be a whole number.")
    .min(1, "Quota must be at least 1.")
    .max(20, "Quota cannot exceed 20."),
});

const CreateLocationSchema = LocationCoreSchema;

const UpdateLocationSchema = LocationCoreSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

export type LocationFormState = {
  error: string | null;
  fieldErrors: Partial<Record<string, string>>;
};

const empty: LocationFormState["fieldErrors"] = {};

function collectFieldErrors(zErr: z.ZodError): LocationFormState["fieldErrors"] {
  const out: LocationFormState["fieldErrors"] = {};
  for (const issue of zErr.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createLocationAction(
  _prev: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const user = await getCurrentUserOrRedirect();
  if (user.role !== "tenant_admin" && user.role !== "super_admin") {
    return { error: "Only tenant admins can add locations.", fieldErrors: empty };
  }
  if (!user.tenantId) {
    return { error: "No tenant context.", fieldErrors: empty };
  }

  const parsed = CreateLocationSchema.safeParse({
    name: formData.get("name"),
    address_line1: formData.get("address_line1"),
    address_line2: formData.get("address_line2"),
    city: formData.get("city"),
    region: formData.get("region"),
    postal_code: formData.get("postal_code"),
    country: formData.get("country"),
    iana_timezone: formData.get("iana_timezone"),
    phone: formData.get("phone"),
    support_email: formData.get("support_email"),
    max_classes_per_student_per_week: formData.get("max_classes_per_student_per_week") || 2,
  });
  if (!parsed.success) {
    return {
      error: "Fix the errors below and try again.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .insert({ ...parsed.data, tenant_id: user.tenantId })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Insert failed.", fieldErrors: empty };
  }

  revalidatePath("/tenant");
  revalidatePath("/tenant/locations");
  redirect(`/tenant/locations/${data.id}/edit?created=1`);
}

export async function updateLocationAction(
  _prev: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const user = await getCurrentUserOrRedirect();
  if (user.role !== "tenant_admin" && user.role !== "super_admin") {
    return { error: "Only tenant admins can edit locations.", fieldErrors: empty };
  }

  const parsed = UpdateLocationSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    address_line1: formData.get("address_line1"),
    address_line2: formData.get("address_line2"),
    city: formData.get("city"),
    region: formData.get("region"),
    postal_code: formData.get("postal_code"),
    country: formData.get("country"),
    iana_timezone: formData.get("iana_timezone"),
    phone: formData.get("phone"),
    support_email: formData.get("support_email"),
    max_classes_per_student_per_week: formData.get("max_classes_per_student_per_week") || 2,
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return {
      error: "Fix the errors below and try again.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const { id, ...updates } = parsed.data;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("locations").update(updates).eq("id", id);
  if (error) return { error: error.message, fieldErrors: empty };

  revalidatePath("/tenant");
  revalidatePath("/tenant/locations");
  revalidatePath(`/tenant/locations/${id}/edit`);
  redirect(`/tenant/locations/${id}/edit?saved=1`);
}

export async function deleteLocationAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (user.role !== "tenant_admin" && user.role !== "super_admin") {
    redirect("/tenant/locations?error=forbidden");
  }
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    redirect("/tenant/locations?error=invalid-id");
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("locations").delete().eq("id", id);
  if (error) redirect(`/tenant/locations?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/tenant");
  revalidatePath("/tenant/locations");
  redirect("/tenant/locations?deleted=1");
}

// ============ Operating hours (BA 8.3 / FR-OH) ============

const HoursRowSchema = z.object({
  weekday: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  open_time: z.string().regex(/^\d{2}:\d{2}$/),
  close_time: z.string().regex(/^\d{2}:\d{2}$/),
});

const HoursPayloadSchema = z.object({
  location_id: z.string().uuid(),
  rows: z.array(HoursRowSchema),
});

export type HoursState = { error: string | null; success: boolean };

export async function saveOperatingHoursAction(
  _prev: HoursState,
  formData: FormData
): Promise<HoursState> {
  const user = await getCurrentUserOrRedirect();
  if (
    user.role !== "tenant_admin" &&
    user.role !== "location_admin" &&
    user.role !== "super_admin"
  ) {
    return { error: "Not allowed.", success: false };
  }

  const rawRows = formData.get("rows");
  let rows: unknown = [];
  try {
    rows = rawRows ? JSON.parse(String(rawRows)) : [];
  } catch {
    return { error: "Invalid hours payload.", success: false };
  }

  const parsed = HoursPayloadSchema.safeParse({
    location_id: formData.get("location_id"),
    rows,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  // Validate close > open per row.
  for (const row of parsed.data.rows) {
    if (row.close_time <= row.open_time) {
      return {
        error: `Close time must be after open time (${row.weekday}).`,
        success: false,
      };
    }
  }

  const supabase = createSupabaseServerClient();

  // Replace-all semantics: delete existing rules for this location, then insert new ones.
  const { error: deleteError } = await supabase
    .from("operating_hours_rules")
    .delete()
    .eq("location_id", parsed.data.location_id);
  if (deleteError) return { error: deleteError.message, success: false };

  if (parsed.data.rows.length > 0) {
    const inserts = parsed.data.rows.map((r) => ({
      location_id: parsed.data.location_id,
      weekday: r.weekday,
      open_time: r.open_time,
      close_time: r.close_time,
    }));
    const { error: insertError } = await supabase
      .from("operating_hours_rules")
      .insert(inserts);
    if (insertError) return { error: insertError.message, success: false };
  }

  revalidatePath(`/tenant/locations/${parsed.data.location_id}/edit`);
  return { error: null, success: true };
}

// ============ Holiday closures (BA 8.3) ============

const HolidaySchema = z.object({
  location_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date."),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date."),
  reason: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type HolidayState = { error: string | null; success: boolean };

export async function addHolidayAction(
  _prev: HolidayState,
  formData: FormData
): Promise<HolidayState> {
  const user = await getCurrentUserOrRedirect();
  if (
    user.role !== "tenant_admin" &&
    user.role !== "location_admin" &&
    user.role !== "super_admin"
  ) {
    return { error: "Not allowed.", success: false };
  }

  const parsed = HolidaySchema.safeParse({
    location_id: formData.get("location_id"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }
  if (parsed.data.end_date < parsed.data.start_date) {
    return { error: "End date must be on or after start date.", success: false };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("holiday_closures").insert(parsed.data);
  if (error) return { error: error.message, success: false };

  revalidatePath(`/tenant/locations/${parsed.data.location_id}/edit`);
  return { error: null, success: true };
}

export async function deleteHolidayAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (
    user.role !== "tenant_admin" &&
    user.role !== "location_admin" &&
    user.role !== "super_admin"
  ) {
    redirect("/tenant/locations?error=forbidden");
  }
  const id = formData.get("id");
  const locationId = formData.get("location_id");
  if (typeof id !== "string" || typeof locationId !== "string") {
    redirect("/tenant/locations?error=invalid-id");
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("holiday_closures").delete().eq("id", id);
  if (error) {
    redirect(
      `/tenant/locations/${locationId}/edit?error=${encodeURIComponent(error.message)}`
    );
  }
  revalidatePath(`/tenant/locations/${locationId}/edit`);
  redirect(`/tenant/locations/${locationId}/edit?holiday_deleted=1`);
}
