import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { EditStudentForm } from "./EditStudentForm";
import {
  EnrollmentsSection,
  type CurrentEnrollment,
  type WizardClassroom,
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

  const today = new Date().toISOString().slice(0, 10);

  // 1) Every active enrollment for this student — shown at the top of the
  //    section so the front desk can see exactly what they're enrolled in
  //    (even if the slot's classroom/location has been deactivated since).
  const { data: myEnrollmentsRaw } = await supabase
    .from("enrollments")
    .select(
      "id, time_slots!inner(weekday, start_time, end_time, classrooms!inner(id, name, color, locations!inner(name)))"
    )
    .eq("student_id", s.id)
    .or(`effective_to.is.null,effective_to.gt.${today}`);

  type MyEnrRaw = {
    id: string;
    time_slots: {
      weekday: string;
      start_time: string;
      end_time: string;
      classrooms: {
        id: string;
        name: string;
        color: string;
        locations: { name: string };
      };
    };
  };
  const currentEnrollments: CurrentEnrollment[] = (
    (myEnrollmentsRaw ?? []) as unknown as MyEnrRaw[]
  ).map((e) => ({
    enrollment_id: e.id,
    weekday: e.time_slots.weekday as EWeekday,
    start_time: String(e.time_slots.start_time).slice(0, 5),
    end_time: String(e.time_slots.end_time).slice(0, 5),
    classroom_id: e.time_slots.classrooms.id,
    classroom_name: e.time_slots.classrooms.name,
    classroom_color: e.time_slots.classrooms.color,
    location_name: e.time_slots.classrooms.locations.name,
  }));

  // The first (any) enrollment's classroom locks the wizard. If the student
  // is in no classes, the picker shows every active classroom.
  const lockedClassroomId =
    currentEnrollments.length > 0 ? currentEnrollments[0].classroom_id : null;

  // 2) Active classrooms with their active slots + capacity counts. This
  //    drives the classroom -> day -> time wizard.
  const { data: classroomsRaw } = await supabase
    .from("classrooms")
    .select(
      "id, name, color, default_capacity, status, locations!inner(id, name, status, max_classes_per_student_per_week), time_slots(id, weekday, start_time, end_time, capacity_override, status)"
    )
    .eq("status", "active");

  type ClassroomRaw = {
    id: string;
    name: string;
    color: string;
    default_capacity: number;
    locations: {
      id: string;
      name: string;
      status: string;
      max_classes_per_student_per_week: number;
    };
    time_slots: {
      id: string;
      weekday: string;
      start_time: string;
      end_time: string;
      capacity_override: number | null;
      status: string;
    }[];
  };
  const activeClassrooms = ((classroomsRaw ?? []) as unknown as ClassroomRaw[])
    .filter((c) => c.locations?.status === "active");

  // Collect slot ids to count enrollments per slot.
  const allSlotIds = activeClassrooms.flatMap((c) =>
    (c.time_slots ?? []).filter((t) => t.status === "active").map((t) => t.id)
  );
  const slotCounts = new Map<string, number>();
  if (allSlotIds.length > 0) {
    const { data: counts } = await supabase
      .from("enrollments")
      .select("time_slot_id")
      .in("time_slot_id", allSlotIds)
      .or(`effective_to.is.null,effective_to.gt.${today}`);
    for (const c of counts ?? []) {
      const id = c.time_slot_id as string;
      slotCounts.set(id, (slotCounts.get(id) ?? 0) + 1);
    }
  }

  // Days the student is ALREADY booked on — used to grey out those day pills
  // in the wizard (and the server still enforces the rule).
  const occupiedWeekdays = new Set<string>(
    currentEnrollments.map((e) => e.weekday)
  );

  const wizardClassrooms: WizardClassroom[] = activeClassrooms.map((c) => {
    const activeSlots = (c.time_slots ?? []).filter((t) => t.status === "active");
    const slots = activeSlots.map((t) => {
      const capacity = t.capacity_override ?? c.default_capacity;
      const enrolled = slotCounts.get(t.id) ?? 0;
      return {
        id: t.id,
        weekday: t.weekday as EWeekday,
        start_time: String(t.start_time).slice(0, 5),
        end_time: String(t.end_time).slice(0, 5),
        capacity,
        enrolled_count: enrolled,
      };
    });
    return {
      id: c.id,
      name: c.name,
      color: c.color,
      default_capacity: c.default_capacity,
      location_name: c.locations.name,
      max_classes_per_week: c.locations.max_classes_per_student_per_week,
      slots,
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/tenant/students"
            className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to students
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-ink">
            {s.first_name} {s.last_name}
          </h1>
          {[s.grade_level, s.lifecycle_status].filter(Boolean).length > 0 ? (
            <p className="text-xs text-muted">
              {[s.grade_level, s.lifecycle_status].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      {searchParams.created ? <Flash kind="success">Student created. Enroll them in a time slot below.</Flash> : null}
      {searchParams.saved ? <Flash kind="success">Saved.</Flash> : null}
      {searchParams.ended ? <Flash kind="success">Enrollment ended.</Flash> : null}
      {searchParams.error ? <Flash kind="danger">{decodeURIComponent(searchParams.error)}</Flash> : null}

      <section className="panel p-4 md:p-5">
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
      </section>

      <section className="panel p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="section-eyebrow">Classes</h2>
          <p className="text-[11px] text-muted">
            One class per day · tap to remove
          </p>
        </div>
        <EnrollmentsSection
          studentId={s.id}
          currentEnrollments={currentEnrollments}
          classrooms={wizardClassrooms}
          occupiedWeekdays={Array.from(occupiedWeekdays)}
          lockedClassroomId={lockedClassroomId}
        />
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
