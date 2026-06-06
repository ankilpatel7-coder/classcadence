"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  locations,
  timeSlots,
  classrooms,
  students,
  enrollments,
  households,
  brandingAssets,
} from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { materializeSessions } from "@/app/tenant/today/actions";

function ensureAdmin(role: string | null | undefined) {
  if (role !== "tenant_admin" && role !== "super_admin") {
    redirect("/tenant?error=forbidden");
  }
}

type SeedStudent = {
  first_name: string;
  last_name: string;
  grade_level: string;
  lifecycle_status: "lead" | "trial" | "active" | "waitlist" | "inactive";
};

type SeedHousehold = {
  primary_parent_name: string;
  primary_email: string;
  primary_phone: string;
  secondary_parent_name?: string;
  secondary_email?: string;
  secondary_phone?: string;
  mailing_address?: string;
  students: SeedStudent[];
};

const SAMPLE_HOUSEHOLDS: SeedHousehold[] = [
  {
    primary_parent_name: "Maya Patel",
    primary_email: "maya.patel.demo@example.com",
    primary_phone: "+15555550101",
    secondary_parent_name: "Rohit Patel",
    secondary_email: "rohit.patel.demo@example.com",
    secondary_phone: "+15555550111",
    mailing_address: "12 Maple Ave, Springfield, IL",
    students: [
      { first_name: "Arya", last_name: "Patel", grade_level: "4th", lifecycle_status: "active" },
      { first_name: "Veer", last_name: "Patel", grade_level: "2nd", lifecycle_status: "active" },
    ],
  },
  {
    primary_parent_name: "James Garcia",
    primary_email: "j.garcia.demo@example.com",
    primary_phone: "+15555550102",
    mailing_address: "445 Oak St, Springfield, IL",
    students: [
      { first_name: "Sofia", last_name: "Garcia", grade_level: "6th", lifecycle_status: "active" },
    ],
  },
  {
    primary_parent_name: "Wei Chen",
    primary_email: "wei.chen.demo@example.com",
    primary_phone: "+15555550103",
    secondary_parent_name: "Hua Chen",
    secondary_phone: "+15555550113",
    students: [
      { first_name: "Lin", last_name: "Chen", grade_level: "5th", lifecycle_status: "active" },
      { first_name: "Hao", last_name: "Chen", grade_level: "3rd", lifecycle_status: "active" },
    ],
  },
  {
    primary_parent_name: "Aisha Khan",
    primary_email: "aisha.khan.demo@example.com",
    primary_phone: "+15555550104",
    students: [
      { first_name: "Zara", last_name: "Khan", grade_level: "7th", lifecycle_status: "active" },
    ],
  },
  {
    primary_parent_name: "Diego Ramirez",
    primary_email: "diego.ramirez.demo@example.com",
    primary_phone: "+15555550105",
    students: [
      { first_name: "Mateo", last_name: "Ramirez", grade_level: "5th", lifecycle_status: "trial" },
      { first_name: "Luna", last_name: "Ramirez", grade_level: "1st", lifecycle_status: "trial" },
    ],
  },
  {
    primary_parent_name: "Priya Sharma",
    primary_email: "priya.sharma.demo@example.com",
    primary_phone: "+15555550106",
    students: [
      { first_name: "Aanya", last_name: "Sharma", grade_level: "8th", lifecycle_status: "active" },
    ],
  },
  {
    primary_parent_name: "Olivia Johnson",
    primary_email: "o.johnson.demo@example.com",
    primary_phone: "+15555550107",
    secondary_parent_name: "Marcus Johnson",
    secondary_phone: "+15555550117",
    students: [
      { first_name: "Ethan", last_name: "Johnson", grade_level: "4th", lifecycle_status: "active" },
      { first_name: "Ella", last_name: "Johnson", grade_level: "6th", lifecycle_status: "active" },
      { first_name: "Owen", last_name: "Johnson", grade_level: "2nd", lifecycle_status: "trial" },
    ],
  },
  {
    primary_parent_name: "Nadia Al-Sayed",
    primary_email: "nadia.alsayed.demo@example.com",
    primary_phone: "+15555550108",
    students: [
      { first_name: "Yusuf", last_name: "Al-Sayed", grade_level: "K", lifecycle_status: "lead" },
    ],
  },
  {
    primary_parent_name: "Hannah Park",
    primary_email: "hannah.park.demo@example.com",
    primary_phone: "+15555550109",
    students: [
      { first_name: "Min", last_name: "Park", grade_level: "9th", lifecycle_status: "waitlist" },
      { first_name: "Jiwoo", last_name: "Park", grade_level: "3rd", lifecycle_status: "active" },
    ],
  },
  {
    primary_parent_name: "Tom Williams",
    primary_email: "t.williams.demo@example.com",
    primary_phone: "+15555550110",
    students: [
      { first_name: "Jack", last_name: "Williams", grade_level: "5th", lifecycle_status: "active" },
      { first_name: "Lily", last_name: "Williams", grade_level: "7th", lifecycle_status: "active" },
    ],
  },
];

const DEMO_TAG = "classcadence:demo";

export async function seedDemoDataAction() {
  const user = await getCurrentUserOrRedirect();
  ensureAdmin(user.role);
  if (!user.tenantId) redirect("/tenant?error=no-tenant");

  // 1. First active location is the demo target. Owner connection bypasses
  // RLS — scope to this tenant in code.
  const locationRows = await db
    .select({ id: locations.id })
    .from(locations)
    .where(
      and(eq(locations.tenantId, user.tenantId), eq(locations.status, "active"))
    )
    .orderBy(asc(locations.createdAt))
    .limit(1);
  const location = locationRows[0];
  if (!location) {
    redirect(
      `/tenant/settings?error=${encodeURIComponent("Create an active location first.")}`
    );
  }

  // 2. Active time slots in any active classroom under that location.
  const slotsData = await db
    .select({
      id: timeSlots.id,
      classroomStatus: classrooms.status,
      locationId: locations.id,
      locationStatus: locations.status,
    })
    .from(timeSlots)
    .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .where(eq(timeSlots.status, "active"));
  const eligibleSlots = slotsData.filter(
    (s) =>
      s.classroomStatus === "active" &&
      s.locationStatus === "active" &&
      s.locationId === location.id
  );

  if (eligibleSlots.length === 0) {
    redirect(
      `/tenant/settings?error=${encodeURIComponent(
        "Add at least one active classroom + time slot before seeding demo data."
      )}`
    );
  }

  let householdsInserted = 0;
  let studentsInserted = 0;
  let enrollmentsInserted = 0;

  for (const sample of SAMPLE_HOUSEHOLDS) {
    // We no longer create a household row — parent info lives on each student
    // record directly. We still track "demo households" via the count for the
    // success banner, since the BA copy still talks in family terms.
    householdsInserted++;

    for (const stu of sample.students) {
      const [student] = await db
        .insert(students)
        .values({
          tenantId: user.tenantId,
          locationId: location.id,
          firstName: stu.first_name,
          lastName: stu.last_name,
          gradeLevel: stu.grade_level,
          lifecycleStatus: stu.lifecycle_status,
          internalNotes: DEMO_TAG,
          primaryParentName: sample.primary_parent_name,
          primaryEmail: sample.primary_email,
          primaryPhone: sample.primary_phone,
          secondaryParentName: sample.secondary_parent_name ?? null,
          secondaryEmail: sample.secondary_email ?? null,
          secondaryPhone: sample.secondary_phone ?? null,
          mailingAddress: sample.mailing_address ?? null,
          notificationPrefsJson: {
            email: true,
            whatsapp: true,
            source: DEMO_TAG,
          },
        })
        .returning({ id: students.id });
      if (!student) continue;
      studentsInserted++;

      // Skip enrollment for leads + waitlisted students so the demo reflects
      // a realistic mix of pipeline states.
      if (stu.lifecycle_status === "lead" || stu.lifecycle_status === "waitlist") {
        continue;
      }

      // Round-robin enroll active + trial students into an existing slot.
      const slot = eligibleSlots[enrollmentsInserted % eligibleSlots.length];
      const today = new Date().toISOString().slice(0, 10);
      try {
        await db.insert(enrollments).values({
          studentId: student.id,
          timeSlotId: slot.id,
          effectiveFrom: today,
        });
        enrollmentsInserted++;
      } catch {
        // ignore — keep seeding the rest
      }
    }
  }

  const materialize = await materializeSessions(14);

  const params = new URLSearchParams({
    seeded_households: String(householdsInserted),
    seeded_students: String(studentsInserted),
    seeded_enrollments: String(enrollmentsInserted),
    materialized_sessions: String(materialize.sessionsInserted),
    materialized_attendance: String(materialize.attendanceInserted),
  });
  if (materialize.error) params.set("error", materialize.error);

  revalidatePath("/tenant/households");
  revalidatePath("/tenant/today");
  redirect(`/tenant/settings?${params.toString()}`);
}

export async function wipeDemoDataAction() {
  const user = await getCurrentUserOrRedirect();
  ensureAdmin(user.role);
  if (!user.tenantId) redirect("/tenant?error=no-tenant");

  // Only delete rows we tagged as demo. Students cascade-clean enrollments +
  // attendance via FKs. Households tagged with the same marker are removed too.
  // Owner connection bypasses RLS — scope to this tenant in code.
  const demoStudents = await db
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.tenantId, user.tenantId),
        eq(students.internalNotes, DEMO_TAG)
      )
    );

  const studentIds = demoStudents.map((s) => s.id);
  let studentsDeleted = 0;
  if (studentIds.length > 0) {
    try {
      await db.delete(students).where(inArray(students.id, studentIds));
    } catch (err) {
      redirect(
        `/tenant/settings?error=${encodeURIComponent(
          err instanceof Error ? err.message : "delete failed"
        )}`
      );
    }
    studentsDeleted = studentIds.length;
  }

  // Legacy household demo cleanup (kept for any leftover rows from pre-0003 seeds).
  const demoHouseholds = await db
    .select({
      id: households.id,
      notification_prefs_json: households.notificationPrefsJson,
    })
    .from(households)
    .where(eq(households.tenantId, user.tenantId));

  const demoHouseholdIds = demoHouseholds
    .filter((h) => {
      const prefs = (h.notification_prefs_json ?? {}) as Record<string, unknown>;
      return prefs.source === DEMO_TAG;
    })
    .map((h) => h.id);

  let householdsDeleted = 0;
  if (demoHouseholdIds.length > 0) {
    try {
      await db.delete(households).where(inArray(households.id, demoHouseholdIds));
      householdsDeleted = demoHouseholdIds.length;
    } catch {
      // ignore — best-effort legacy cleanup
    }
  }

  revalidatePath("/tenant/households");
  revalidatePath("/tenant/today");
  redirect(
    `/tenant/settings?wiped_students=${studentsDeleted}&wiped_households=${householdsDeleted}`
  );
}

// ============ Branding (BA 8.19) ============

const BrandingSchema = z.object({
  primary_color_hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color, e.g. #1AA876."),
  logo_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  sender_display_name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type BrandingState = { error: string | null; success: boolean };

export async function saveBrandingAction(
  _prev: BrandingState,
  formData: FormData
): Promise<BrandingState> {
  const user = await getCurrentUserOrRedirect();
  ensureAdmin(user.role);
  if (!user.tenantId) return { error: "No tenant context.", success: false };

  const parsed = BrandingSchema.safeParse({
    primary_color_hex: formData.get("primary_color_hex"),
    logo_url: formData.get("logo_url"),
    sender_display_name: formData.get("sender_display_name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  const { primary_color_hex, logo_url, sender_display_name } = parsed.data;
  try {
    await db
      .insert(brandingAssets)
      .values({
        tenantId: user.tenantId,
        primaryColorHex: primary_color_hex,
        logoUrl: logo_url,
        senderDisplayName: sender_display_name,
      })
      .onConflictDoUpdate({
        target: brandingAssets.tenantId,
        set: {
          primaryColorHex: primary_color_hex,
          logoUrl: logo_url,
          senderDisplayName: sender_display_name,
        },
      });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Update failed.",
      success: false,
    };
  }

  revalidatePath("/tenant/settings");
  revalidatePath("/tenant");
  return { error: null, success: true };
}

export async function wipeAllTenantDataAction() {
  const user = await getCurrentUserOrRedirect();
  ensureAdmin(user.role);
  if (!user.tenantId) redirect("/tenant?error=no-tenant");

  // Delete in FK-friendly order. Households + students + locations are all
  // tenant-scoped — deleting them cascades through enrollments, sessions, etc.
  // Locations stay (the tenant probably wants to keep their setup).
  // Owner connection bypasses RLS — scope to this tenant in code.

  // 1. Students -> cascades to enrollments + attendance
  await db.delete(students).where(eq(students.tenantId, user.tenantId));
  // 2. Households (now safe since students are gone)
  await db.delete(households).where(eq(households.tenantId, user.tenantId));
  // 3. Sessions don't have tenant_id directly; cleanup via time_slots is
  //    cascade-on-delete-of-slot. Leave time slots alone (still useful config).
  //    But we can wipe stranded sessions older than today to clean up.
  //    Skipped for v1 — they'll be re-materialized.

  revalidatePath("/tenant/households");
  revalidatePath("/tenant/today");
  redirect("/tenant/settings?wiped_all=1");
}
