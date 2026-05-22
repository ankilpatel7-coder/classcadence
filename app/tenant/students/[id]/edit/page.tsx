import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { EditStudentForm } from "./EditStudentForm";
import {
  EnrollmentsSection,
  type SlotCard,
  type Weekday as EWeekday,
} from "./EnrollmentsSection";

export const metadata = { title: "Edit student — ClassCadence" };
export const dynamic = "force-dynamic";

type StudentRow = {
  id: string;
  location_id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  grade_level: string | null;
  lifecycle_status: string;
  internal_notes: string | null;
  primary_parent_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  secondary_parent_name: string | null;
  secondary_email: string | null;
  secondary_phone: string | null;
  mailing_address: string | null;
  notification_prefs_json: { email?: boolean; whatsapp?: boolean } | null;
};

export default async function EditStudentPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string; saved?: string; error?: string; ended?: string };
}) {
  await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, location_id, first_name, last_name, dob, grade_level, lifecycle_status, internal_notes, primary_parent_name, primary_email, primary_phone, secondary_parent_name, secondary_email, secondary_phone, mailing_address, notification_prefs_json"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!student) notFound();
  const s = student as StudentRow;
  const notify = s.notification_prefs_json ?? { email: true, whatsapp: true };

  const { data: locations } = await supabase
    .from("locations").select("id, name").order("name");

  // Fetch slots + classroom + location info + capacity.
  const { data: slotsData } = await supabase
    .from("time_slots")
    .select(
      "id, weekday, start_time, end_time, capacity_override, status, classrooms!inner(id, name, color, default_capacity, status, locations!inner(id, name, status))"
    )
    .eq("status", "active");

  type SlotRowRaw = {
    id: string;
    weekday: string;
    start_time: string;
    end_time: string;
    capacity_override: number | null;
    classrooms: {
      id: string;
      name: string;
      color: string;
      default_capacity: number;
      status: string;
      locations: { id: string; name: string; status: string };
    };
  };

  const activeSlots = ((slotsData ?? []) as unknown as SlotRowRaw[]).filter(
    (slot) =>
      slot.classrooms?.status === "active" &&
      slot.classrooms?.locations?.status === "active"
  );

  // For the slot ids we have, fetch all active enrollments to count + detect this student's.
  const slotIds = activeSlots.map((s) => s.id);
  const today = new Date().toISOString().slice(0, 10);

  let enrollmentsBySlot = new Map<
    string,
    { id: string; student_id: string }[]
  >();
  if (slotIds.length > 0) {
    const { data: en } = await supabase
      .from("enrollments")
      .select("id, time_slot_id, student_id")
      .in("time_slot_id", slotIds)
      .or(`effective_to.is.null,effective_to.gte.${today}`);
    for (const e of en ?? []) {
      const arr = enrollmentsBySlot.get(e.time_slot_id as string) ?? [];
      arr.push({ id: e.id as string, student_id: e.student_id as string });
      enrollmentsBySlot.set(e.time_slot_id as string, arr);
    }
  }

  const slotCards: SlotCard[] = activeSlots.map((slot) => {
    const entries = enrollmentsBySlot.get(slot.id) ?? [];
    const mine = entries.find((e) => e.student_id === s.id);
    return {
      id: slot.id,
      weekday: slot.weekday as EWeekday,
      start_time: String(slot.start_time).slice(0, 5),
      end_time: String(slot.end_time).slice(0, 5),
      classroom_name: slot.classrooms.name,
      classroom_color: slot.classrooms.color,
      location_name: slot.classrooms.locations.name,
      capacity:
        slot.capacity_override ?? slot.classrooms.default_capacity,
      enrolled_count: entries.length,
      current_student_enrollment_id: mine?.id ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/tenant/students"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to students
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink">
          {s.first_name} {s.last_name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {[s.grade_level, s.lifecycle_status].filter(Boolean).join(" · ")}
        </p>
      </div>

      {searchParams.created ? <Flash kind="success">Student created. Enroll them in a time slot below.</Flash> : null}
      {searchParams.saved ? <Flash kind="success">Saved.</Flash> : null}
      {searchParams.ended ? <Flash kind="success">Enrollment ended.</Flash> : null}
      {searchParams.error ? <Flash kind="danger">{decodeURIComponent(searchParams.error)}</Flash> : null}

      <section className="panel p-6">
        <h2 className="section-eyebrow">Details</h2>
        <div className="mt-4">
          <EditStudentForm
            student={{
              id: s.id,
              location_id: s.location_id,
              first_name: s.first_name,
              last_name: s.last_name,
              dob: s.dob,
              grade_level: s.grade_level,
              lifecycle_status: s.lifecycle_status,
              internal_notes: s.internal_notes,
              primary_parent_name: s.primary_parent_name ?? undefined,
              primary_email: s.primary_email,
              primary_phone: s.primary_phone,
              secondary_parent_name: s.secondary_parent_name,
              secondary_email: s.secondary_email,
              secondary_phone: s.secondary_phone,
              mailing_address: s.mailing_address,
              notify_email: notify.email ?? true,
              notify_whatsapp: notify.whatsapp ?? true,
            }}
            locations={locations ?? []}
          />
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="section-eyebrow">Classes</h2>
        <p className="mt-1 text-xs text-muted">
          Tap a time slot to enroll this student. Their weekly class repeats every
          week from today until you tap it again to remove. Full slots are locked.
        </p>
        <div className="mt-4">
          <EnrollmentsSection studentId={s.id} slots={slotCards} />
        </div>
      </section>
    </div>
  );
}

function Flash({
  kind, children,
}: {
  kind: "success" | "danger"; children: React.ReactNode;
}) {
  const styles =
    kind === "success"
      ? "border-success/30 bg-success-soft text-success"
      : "border-danger/30 bg-danger/10 text-danger";
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${styles}`}>{children}</div>
  );
}
