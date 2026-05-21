"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { materializeSessions } from "@/app/tenant/today/actions";

function ensureAdmin(role: string | null | undefined) {
  if (role !== "tenant_admin" && role !== "super_admin") {
    redirect("/tenant?error=forbidden");
  }
}

const SAMPLE_HOUSEHOLDS = [
  {
    primary_parent_name: "Maya Patel",
    primary_email: "maya.patel.demo@example.com",
    primary_phone: "+15555550101",
    students: [
      { first_name: "Arya", last_name: "Patel", grade_level: "4th" },
      { first_name: "Veer", last_name: "Patel", grade_level: "2nd" },
    ],
  },
  {
    primary_parent_name: "James Garcia",
    primary_email: "j.garcia.demo@example.com",
    primary_phone: "+15555550102",
    students: [{ first_name: "Sofia", last_name: "Garcia", grade_level: "6th" }],
  },
  {
    primary_parent_name: "Wei Chen",
    primary_email: "wei.chen.demo@example.com",
    primary_phone: "+15555550103",
    students: [
      { first_name: "Lin", last_name: "Chen", grade_level: "5th" },
      { first_name: "Hao", last_name: "Chen", grade_level: "3rd" },
    ],
  },
  {
    primary_parent_name: "Aisha Khan",
    primary_email: "aisha.khan.demo@example.com",
    primary_phone: "+15555550104",
    students: [{ first_name: "Zara", last_name: "Khan", grade_level: "7th" }],
  },
];

const DEMO_TAG = "classcadence:demo";

export async function seedDemoDataAction() {
  const user = await getCurrentUserOrRedirect();
  ensureAdmin(user.role);
  if (!user.tenantId) redirect("/tenant?error=no-tenant");

  const supabase = createSupabaseServerClient();

  // 1. First active location is the demo target.
  const { data: locations } = await supabase
    .from("locations")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);
  const location = locations?.[0];
  if (!location) {
    redirect(
      `/tenant/settings?error=${encodeURIComponent("Create an active location first.")}`
    );
  }

  // 2. Active time slots in any active classroom under that location.
  const { data: slotsData } = await supabase
    .from("time_slots")
    .select(
      "id, classrooms!inner(status, locations!inner(id, status))"
    )
    .eq("status", "active");
  type SlotRowRaw = {
    id: string;
    classrooms: { status: string; locations: { id: string; status: string } };
  };
  const eligibleSlots = ((slotsData ?? []) as unknown as SlotRowRaw[]).filter(
    (s) =>
      s.classrooms?.status === "active" &&
      s.classrooms?.locations?.status === "active" &&
      s.classrooms.locations.id === location.id
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
    const { data: hh, error: hhErr } = await supabase
      .from("households")
      .insert({
        tenant_id: user.tenantId,
        primary_parent_name: sample.primary_parent_name,
        primary_email: sample.primary_email,
        primary_phone: sample.primary_phone,
        notification_prefs_json: {
          email: true,
          whatsapp: true,
          source: DEMO_TAG,
        },
      })
      .select("id")
      .single();
    if (hhErr || !hh) continue;
    householdsInserted++;

    for (const stu of sample.students) {
      const { data: student } = await supabase
        .from("students")
        .insert({
          tenant_id: user.tenantId,
          household_id: hh.id,
          location_id: location.id,
          first_name: stu.first_name,
          last_name: stu.last_name,
          grade_level: stu.grade_level,
          lifecycle_status: "active",
          internal_notes: DEMO_TAG,
        })
        .select("id")
        .single();
      if (!student) continue;
      studentsInserted++;

      // Round-robin enroll each student into an existing slot.
      const slot = eligibleSlots[(studentsInserted - 1) % eligibleSlots.length];
      const today = new Date().toISOString().slice(0, 10);
      const { error: enrErr } = await supabase.from("enrollments").insert({
        student_id: student.id,
        time_slot_id: slot.id,
        effective_from: today,
      });
      if (!enrErr) enrollmentsInserted++;
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

  const supabase = createSupabaseServerClient();

  // Only delete rows we tagged as demo. Students cascade-clean enrollments +
  // attendance via FKs. Households tagged with the same marker are removed too.
  const { data: demoStudents } = await supabase
    .from("students")
    .select("id")
    .eq("tenant_id", user.tenantId)
    .eq("internal_notes", DEMO_TAG);

  const studentIds = (demoStudents ?? []).map((s) => s.id);
  let studentsDeleted = 0;
  if (studentIds.length > 0) {
    const { error } = await supabase
      .from("students")
      .delete()
      .in("id", studentIds);
    if (error) {
      redirect(`/tenant/settings?error=${encodeURIComponent(error.message)}`);
    }
    studentsDeleted = studentIds.length;
  }

  const { data: demoHouseholds } = await supabase
    .from("households")
    .select("id, notification_prefs_json")
    .eq("tenant_id", user.tenantId);

  const demoHouseholdIds = (demoHouseholds ?? [])
    .filter((h) => {
      const prefs = (h.notification_prefs_json ?? {}) as Record<string, unknown>;
      return prefs.source === DEMO_TAG;
    })
    .map((h) => h.id);

  let householdsDeleted = 0;
  if (demoHouseholdIds.length > 0) {
    const { error } = await supabase
      .from("households")
      .delete()
      .in("id", demoHouseholdIds);
    if (error) {
      redirect(`/tenant/settings?error=${encodeURIComponent(error.message)}`);
    }
    householdsDeleted = demoHouseholdIds.length;
  }

  revalidatePath("/tenant/households");
  revalidatePath("/tenant/today");
  redirect(
    `/tenant/settings?wiped_students=${studentsDeleted}&wiped_households=${householdsDeleted}`
  );
}

export async function wipeAllTenantDataAction() {
  const user = await getCurrentUserOrRedirect();
  ensureAdmin(user.role);
  if (!user.tenantId) redirect("/tenant?error=no-tenant");

  const supabase = createSupabaseServerClient();
  // Delete in FK-friendly order. Households + students + locations are all
  // tenant-scoped — deleting them cascades through enrollments, sessions, etc.
  // Locations stay (the tenant probably wants to keep their setup).

  // 1. Students -> cascades to enrollments + attendance
  await supabase.from("students").delete().eq("tenant_id", user.tenantId);
  // 2. Households (now safe since students are gone)
  await supabase.from("households").delete().eq("tenant_id", user.tenantId);
  // 3. Sessions don't have tenant_id directly; cleanup via time_slots is
  //    cascade-on-delete-of-slot. Leave time slots alone (still useful config).
  //    But we can wipe stranded sessions older than today to clean up.
  //    Skipped for v1 — they'll be re-materialized.

  revalidatePath("/tenant/households");
  revalidatePath("/tenant/today");
  redirect("/tenant/settings?wiped_all=1");
}
