"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

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

  const supabase = createSupabaseServerClient();
  const { location_id, ...rest } = parsed.data;
  const { data, error } = await supabase
    .from("classrooms")
    .insert({ location_id, ...rest })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Insert failed.", fieldErrors: empty };
  }

  revalidatePath(`/tenant/locations/${location_id}/edit`);
  redirect(
    `/tenant/locations/${location_id}/classrooms/${data.id}/edit?created=1`
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

  const { id, location_id, ...updates } = parsed.data;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("classrooms")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message, fieldErrors: empty };

  revalidatePath(`/tenant/locations/${location_id}/edit`);
  revalidatePath(`/tenant/locations/${location_id}/classrooms/${id}/edit`);
  redirect(`/tenant/locations/${location_id}/classrooms/${id}/edit?saved=1`);
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
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("classrooms").delete().eq("id", id);
  if (error) {
    redirect(
      `/tenant/locations/${locationId}/edit?error=${encodeURIComponent(error.message)}`
    );
  }
  revalidatePath(`/tenant/locations/${locationId}/edit`);
  redirect(`/tenant/locations/${locationId}/edit?classroom_deleted=1`);
}

// ===================== Time slots =====================

const TimeSlotInputSchema = z.object({
  weekday: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time."),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time."),
  capacity_override: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 500), {
      message: "Capacity override must be an integer 1–500 or blank.",
    }),
  notes: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

const TimeSlotsPayloadSchema = z.object({
  classroom_id: z.string().uuid(),
  location_id: z.string().uuid(),
  slots: z.array(TimeSlotInputSchema),
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

  let slots: unknown = [];
  try {
    const raw = formData.get("slots");
    slots = raw ? JSON.parse(String(raw)) : [];
  } catch {
    return { error: "Invalid slots payload.", success: false };
  }

  const parsed = TimeSlotsPayloadSchema.safeParse({
    classroom_id: formData.get("classroom_id"),
    location_id: formData.get("location_id"),
    slots,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      success: false,
    };
  }

  // Validate close > open + overlap detection + fit-within-hours.
  for (const s of parsed.data.slots) {
    if (s.end_time <= s.start_time) {
      return {
        error: `End time must be after start time (${s.weekday}).`,
        success: false,
      };
    }
  }
  for (let i = 0; i < parsed.data.slots.length; i++) {
    for (let j = i + 1; j < parsed.data.slots.length; j++) {
      if (slotsOverlap(parsed.data.slots[i], parsed.data.slots[j])) {
        const a = parsed.data.slots[i];
        const b = parsed.data.slots[j];
        return {
          error:
            `Overlapping slots on ${a.weekday.toUpperCase()}: ` +
            `${a.start_time}–${a.end_time} and ${b.start_time}–${b.end_time}.`,
          success: false,
        };
      }
    }
  }

  // Fetch operating hours for FR-TS-03 validation.
  const supabase = createSupabaseServerClient();
  const { data: hoursData } = await supabase
    .from("operating_hours_rules")
    .select("weekday, open_time, close_time")
    .eq("location_id", parsed.data.location_id);

  const hours = (hoursData ?? []) as HoursRule[];
  if (hours.length > 0) {
    for (const s of parsed.data.slots) {
      if (!slotFitsHours(s, hours)) {
        return {
          error:
            `Slot on ${s.weekday.toUpperCase()} ${s.start_time}–${s.end_time} ` +
            `falls outside the location's operating hours for that day. ` +
            `Update operating hours first or move the slot.`,
          success: false,
        };
      }
    }
  }

  // Replace-all semantics for this classroom.
  const { error: deleteError } = await supabase
    .from("time_slots")
    .delete()
    .eq("classroom_id", parsed.data.classroom_id);
  if (deleteError) return { error: deleteError.message, success: false };

  if (parsed.data.slots.length > 0) {
    const inserts = parsed.data.slots.map((s) => ({
      classroom_id: parsed.data.classroom_id,
      weekday: s.weekday,
      start_time: s.start_time,
      end_time: s.end_time,
      capacity_override: s.capacity_override,
      notes: s.notes,
    }));
    const { error: insertError } = await supabase.from("time_slots").insert(inserts);
    if (insertError) return { error: insertError.message, success: false };
  }

  revalidatePath(
    `/tenant/locations/${parsed.data.location_id}/classrooms/${parsed.data.classroom_id}/edit`
  );
  return { error: null, success: true };
}
