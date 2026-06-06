"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  locations,
  operatingHoursRules,
  holidayClosures,
} from "@/lib/db/schema";
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
  success?: boolean;
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

  const {
    address_line1,
    address_line2,
    postal_code,
    iana_timezone,
    support_email,
    max_classes_per_student_per_week,
    ...core
  } = parsed.data;

  let inserted: { id: string } | undefined;
  try {
    [inserted] = await db
      .insert(locations)
      .values({
        ...core,
        addressLine1: address_line1,
        addressLine2: address_line2,
        postalCode: postal_code,
        ianaTimezone: iana_timezone,
        supportEmail: support_email,
        maxClassesPerStudentPerWeek: max_classes_per_student_per_week,
        tenantId: user.tenantId,
      })
      .returning({ id: locations.id });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Insert failed.",
      fieldErrors: empty,
    };
  }

  if (!inserted) {
    return { error: "Insert failed.", fieldErrors: empty };
  }

  revalidatePath("/tenant");
  revalidatePath("/tenant/locations");
  redirect(`/tenant/locations/${inserted.id}/edit?created=1`);
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

  const {
    id,
    address_line1,
    address_line2,
    postal_code,
    iana_timezone,
    support_email,
    max_classes_per_student_per_week,
    status,
    name,
    city,
    region,
    country,
    phone,
  } = parsed.data;

  // App-level tenant scoping: restrict the update to the caller's tenant.
  try {
    await db
      .update(locations)
      .set({
        name,
        addressLine1: address_line1,
        addressLine2: address_line2,
        city,
        region,
        postalCode: postal_code,
        country,
        ianaTimezone: iana_timezone,
        phone,
        supportEmail: support_email,
        maxClassesPerStudentPerWeek: max_classes_per_student_per_week,
        status,
      })
      .where(
        user.tenantId
          ? and(eq(locations.id, id), eq(locations.tenantId, user.tenantId))
          : eq(locations.id, id)
      );
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Update failed.",
      fieldErrors: empty,
    };
  }

  revalidatePath("/tenant");
  revalidatePath("/tenant/locations");
  revalidatePath(`/tenant/locations/${id}/edit`);
  return { error: null, fieldErrors: empty, success: true };
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
  const locationId = id as string;
  try {
    await db
      .delete(locations)
      .where(
        user.tenantId
          ? and(
              eq(locations.id, locationId),
              eq(locations.tenantId, user.tenantId)
            )
          : eq(locations.id, locationId)
      );
  } catch (err) {
    redirect(
      `/tenant/locations?error=${encodeURIComponent(
        err instanceof Error ? err.message : "Delete failed."
      )}`
    );
  }

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

  // App-level tenant scoping: confirm the location belongs to the caller's
  // tenant before mutating its hours (owner connection bypasses RLS).
  if (!(await locationInTenant(parsed.data.location_id, user.tenantId))) {
    return { error: "Not allowed.", success: false };
  }

  try {
    // Replace-all semantics: delete existing rules for this location, then insert new ones.
    await db
      .delete(operatingHoursRules)
      .where(eq(operatingHoursRules.locationId, parsed.data.location_id));

    if (parsed.data.rows.length > 0) {
      await db.insert(operatingHoursRules).values(
        parsed.data.rows.map((r) => ({
          locationId: parsed.data.location_id,
          weekday: r.weekday,
          openTime: r.open_time,
          closeTime: r.close_time,
        }))
      );
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Save failed.",
      success: false,
    };
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

  // App-level tenant scoping: confirm the location belongs to the tenant.
  if (!(await locationInTenant(parsed.data.location_id, user.tenantId))) {
    return { error: "Not allowed.", success: false };
  }

  try {
    await db.insert(holidayClosures).values({
      locationId: parsed.data.location_id,
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date,
      reason: parsed.data.reason,
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Save failed.",
      success: false,
    };
  }

  revalidatePath(`/tenant/locations/${parsed.data.location_id}/edit`);
  return { error: null, success: true };
}

// App-level tenant scoping helper: true when the location exists and (for a
// tenant-scoped caller) belongs to their tenant. super_admin (null tenantId)
// may act across tenants.
async function locationInTenant(
  locationId: string,
  tenantId: string | null
): Promise<boolean> {
  const [row] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(
      tenantId
        ? and(eq(locations.id, locationId), eq(locations.tenantId, tenantId))
        : eq(locations.id, locationId)
    )
    .limit(1);
  return Boolean(row);
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
  const holidayId = id as string;
  const locationIdStr = locationId as string;

  // App-level tenant scoping: only delete a holiday whose location belongs to
  // the caller's tenant.
  if (!(await locationInTenant(locationIdStr, user.tenantId))) {
    redirect(`/tenant/locations?error=forbidden`);
  }

  try {
    await db
      .delete(holidayClosures)
      .where(
        and(
          eq(holidayClosures.id, holidayId),
          eq(holidayClosures.locationId, locationIdStr)
        )
      );
  } catch (err) {
    redirect(
      `/tenant/locations/${locationIdStr}/edit?error=${encodeURIComponent(
        err instanceof Error ? err.message : "Delete failed."
      )}`
    );
  }
  revalidatePath(`/tenant/locations/${locationIdStr}/edit`);
  redirect(`/tenant/locations/${locationIdStr}/edit?holiday_deleted=1`);
}
