"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classrooms,
  locations,
  operatingHoursRules,
  enrollments,
  timeSlots,
} from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { materializeSessions } from "@/app/tenant/today/actions";

// App-level tenant scoping helpers: the owner connection bypasses RLS, so we
// confirm ownership in code. super_admin (null tenantId) may act across tenants.
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

async function classroomInTenant(
  classroomId: string,
  locationId: string,
  tenantId: string | null
): Promise<boolean> {
  const [row] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .innerJoin(locations, eq(classrooms.locationId, locations.id))
    .where(
      and(
        eq(classrooms.id, classroomId),
        eq(classrooms.locationId, locationId),
        tenantId ? eq(locations.tenantId, tenantId) : undefined
      )
    )
    .limit(1);
  return Boolean(row);
}

const CORE = {
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  default_capacity: z.coerce
    .number()
    .int("Capacity must be a whole number.")
    .min(1, "Capacity must be at least 1.")
    .max(500, "Capacity is unrealistically high."),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color (e.g. #1E3A8A).")
    .default("#1E3A8A"),
};

const CreateClassroomSchema = z.object({
  location_id: z.string().uuid(),
  ...CORE,
});

const UpdateClassroomSchema = z.object({
  id: z.string().uuid(),
  location_id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
  ...CORE,
});

export type ClassroomFormState = {
  error: string | null;
  fieldErrors: Partial<Record<string, string>>;
  success?: boolean;
};

const empty: ClassroomFormState["fieldErrors"] = {};

function collectFieldErrors(zErr: z.ZodError): ClassroomFormState["fieldErrors"] {
  const out: ClassroomFormState["fieldErrors"] = {};
  for (const issue of zErr.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

function canWriteClassrooms(role: string | null | undefined) {
  return (
    role === "tenant_admin" ||
    role === "location_admin" ||
    role === "super_admin"
  );
}

export async function createClassroomAction(
  _prev: ClassroomFormState,
  formData: FormData
): Promise<ClassroomFormState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWriteClassrooms(user.role)) {
    return { error: "Not allowed.", fieldErrors: empty };
  }

  const parsed = CreateClassroomSchema.safeParse({
    location_id: formData.get("location_id"),
    name: formData.get("name"),
    description: formData.get("description"),
    default_capacity: formData.get("default_capacity"),
    color: formData.get("color") || "#1E3A8A",
  });
  if (!parsed.success) {
    return {
      error: "Fix the errors below and try again.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const { location_id, name, description, default_capacity, color } = parsed.data;

  // Confirm the target location belongs to the caller's tenant before writing.
  if (!(await locationInTenant(location_id, user.tenantId))) {
    return { error: "Not allowed.", fieldErrors: empty };
  }

  let inserted: { id: string } | undefined;
  try {
    [inserted] = await db
      .insert(classrooms)
      .values({
        locationId: location_id,
        name,
        description,
        defaultCapacity: default_capacity,
        color,
      })
      .returning({ id: classrooms.id });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Insert failed.",
      fieldErrors: empty,
    };
  }

  if (!inserted) {
    return { error: "Insert failed.", fieldErrors: empty };
  }

  revalidatePath(`/tenant/locations/${location_id}/edit`);
  redirect(
    `/tenant/locations/${location_id}/classrooms/${inserted.id}/edit?created=1`
  );
}

export async function updateClassroomAction(
  _prev: ClassroomFormState,
  formData: FormData
): Promise<ClassroomFormState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWriteClassrooms(user.role)) {
    return { error: "Not allowed.", fieldErrors: empty };
  }

  const parsed = UpdateClassroomSchema.safeParse({
    id: formData.get("id"),
    location_id: formData.get("location_id"),
    status: formData.get("status"),
    name: formData.get("name"),
    description: formData.get("description"),
    default_capacity: formData.get("default_capacity"),
    color: formData.get("color") || "#1E3A8A",
  });
  if (!parsed.success) {
    return {
      error: "Fix the errors below and try again.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const { id, location_id, status, name, description, default_capacity, color } =
    parsed.data;

  // Confirm the classroom belongs to a location in the caller's tenant.
  if (!(await classroomInTenant(id, location_id, user.tenantId))) {
    return { error: "Not allowed.", fieldErrors: empty };
  }

  try {
    await db
      .update(classrooms)
      .set({
        name,
        description,
        defaultCapacity: default_capacity,
        color,
        status,
      })
      .where(eq(classrooms.id, id));
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Update failed.",
      fieldErrors: empty,
    };
  }

  revalidatePath(`/tenant/locations/${location_id}/edit`);
  revalidatePath(`/tenant/locations/${location_id}/classrooms/${id}/edit`);
  return { error: null, fieldErrors: empty, success: true };
}

export async function deleteClassroomAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canWriteClassrooms(user.role)) {
    redirect("/tenant/locations?error=forbidden");
  }
  const id = formData.get("id");
  const locationId = formData.get("location_id");
  if (typeof id !== "string" || typeof locationId !== "string") {
    redirect("/tenant/locations?error=invalid-id");
  }
  const classroomId = id as string;
  const locationIdStr = locationId as string;

  // Confirm the classroom belongs to a location in the caller's tenant.
  if (!(await classroomInTenant(classroomId, locationIdStr, user.tenantId))) {
    redirect("/tenant/locations?error=forbidden");
  }

  try {
    await db.delete(classrooms).where(eq(classrooms.id, classroomId));
  } catch (err) {
    redirect(
      `/tenant/locations/${locationIdStr}/edit?error=${encodeURIComponent(
        err instanceof Error ? err.message : "Delete failed."
      )}`
    );
  }
  revalidatePath(`/tenant/locations/${locationIdStr}/edit`);
  redirect(`/tenant/locations/${locationIdStr}/edit?classroom_deleted=1`);
}

// ===================== Time slots =====================

const NewCellSchema = z.object({
  weekday: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time."),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time."),
});

const TimeSlotsPayloadSchema = z.object({
  classroom_id: z.string().uuid(),
  location_id: z.string().uuid(),
  added_cells: z.array(NewCellSchema),
  removed_slot_ids: z.array(z.string().uuid()),
});

export type TimeSlotsState = { error: string | null; success: boolean };

type HoursRule = {
  weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  open_time: string;
  close_time: string;
};

function trimTime(s: string) {
  return s.slice(0, 5);
}

function slotsOverlap(
  a: { weekday: string; start_time: string; end_time: string },
  b: { weekday: string; start_time: string; end_time: string }
) {
  if (a.weekday !== b.weekday) return false;
  return a.start_time < b.end_time && b.start_time < a.end_time;
}

function slotFitsHours(
  slot: { weekday: string; start_time: string; end_time: string },
  hours: HoursRule[]
) {
  const dayWindows = hours.filter((h) => h.weekday === slot.weekday);
  if (dayWindows.length === 0) return false;
  return dayWindows.some(
    (w) => trimTime(w.open_time) <= slot.start_time && slot.end_time <= trimTime(w.close_time)
  );
}

export async function saveTimeSlotsAction(
  _prev: TimeSlotsState,
  formData: FormData
): Promise<TimeSlotsState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWriteClassrooms(user.role)) {
    return { error: "Not allowed.", success: false };
  }

  let addedCells: unknown = [];
  let removedSlotIds: unknown = [];
  try {
    const addedRaw = formData.get("added_cells");
    const removedRaw = formData.get("removed_slot_ids");
    addedCells = addedRaw ? JSON.parse(String(addedRaw)) : [];
    removedSlotIds = removedRaw ? JSON.parse(String(removedRaw)) : [];
  } catch {
    return { error: "Invalid slots payload.", success: false };
  }

  const parsed = TimeSlotsPayloadSchema.safeParse({
    classroom_id: formData.get("classroom_id"),
    location_id: formData.get("location_id"),
    added_cells: addedCells,
    removed_slot_ids: removedSlotIds,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      success: false,
    };
  }

  for (const s of parsed.data.added_cells) {
    if (s.end_time <= s.start_time) {
      return {
        error: `End time must be after start time (${s.weekday}).`,
        success: false,
      };
    }
  }

  // App-level tenant scoping: confirm the classroom + location belong to the
  // caller's tenant before any reads/writes.
  if (
    !(await classroomInTenant(
      parsed.data.classroom_id,
      parsed.data.location_id,
      user.tenantId
    ))
  ) {
    return { error: "Not allowed.", success: false };
  }

  // FR-TS-03: every added cell must sit inside operating hours for that weekday.
  const hoursData = await db
    .select({
      weekday: operatingHoursRules.weekday,
      open_time: operatingHoursRules.openTime,
      close_time: operatingHoursRules.closeTime,
    })
    .from(operatingHoursRules)
    .where(eq(operatingHoursRules.locationId, parsed.data.location_id));
  const hours = hoursData as HoursRule[];

  if (hours.length > 0) {
    for (const s of parsed.data.added_cells) {
      if (!slotFitsHours(s, hours)) {
        return {
          error:
            `${s.weekday.toUpperCase()} ${s.start_time}–${s.end_time} is ` +
            `outside the location's operating hours for that day.`,
          success: false,
        };
      }
    }
  }

  // 1. For each removed slot, soft-delete (status=inactive) if it has any
  //    enrollments referencing it; hard-delete otherwise. This protects the
  //    REFERENCES enrollments(time_slot_id) ON DELETE RESTRICT relationship.
  if (parsed.data.removed_slot_ids.length > 0) {
    const refRows = await db
      .select({ time_slot_id: enrollments.timeSlotId })
      .from(enrollments)
      .where(inArray(enrollments.timeSlotId, parsed.data.removed_slot_ids));
    const refSet = new Set(refRows.map((r) => r.time_slot_id));
    const softTargets = parsed.data.removed_slot_ids.filter((id) => refSet.has(id));
    const hardTargets = parsed.data.removed_slot_ids.filter(
      (id) => !refSet.has(id)
    );

    try {
      if (softTargets.length > 0) {
        await db
          .update(timeSlots)
          .set({ status: "inactive" })
          .where(inArray(timeSlots.id, softTargets));
      }
      if (hardTargets.length > 0) {
        await db.delete(timeSlots).where(inArray(timeSlots.id, hardTargets));
      }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Save failed.",
        success: false,
      };
    }
  }

  // 2. Insert new cells. Capture the inserted IDs so we can materialize
  //    only the slots that actually changed.
  let insertedSlotIds: string[] = [];
  if (parsed.data.added_cells.length > 0) {
    try {
      const inserted = await db
        .insert(timeSlots)
        .values(
          parsed.data.added_cells.map((s) => ({
            classroomId: parsed.data.classroom_id,
            weekday: s.weekday,
            startTime: s.start_time,
            endTime: s.end_time,
          }))
        )
        .returning({ id: timeSlots.id });
      insertedSlotIds = inserted.map((r) => r.id);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Save failed.",
        success: false,
      };
    }
  }

  // Auto-materialize the just-inserted slots so they appear on Today/Schedule
  // immediately. Targeted by slot id — no full-tenant scan.
  if (insertedSlotIds.length > 0) {
    await materializeSessions(14, insertedSlotIds).catch(() => {
      /* best-effort; Force refresh button on Settings covers gaps */
    });
  }

  revalidatePath(
    `/tenant/locations/${parsed.data.location_id}/classrooms/${parsed.data.classroom_id}/edit`
  );
  return { error: null, success: true };
}
