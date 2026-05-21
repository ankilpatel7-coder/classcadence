import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { EditStudentForm } from "./EditStudentForm";
import { EnrollmentsSection, type SlotOption, type EnrollmentRow } from "./EnrollmentsSection";

export const metadata = { title: "Edit student — ClassCadence" };
export const dynamic = "force-dynamic";

const WEEKDAY_LABEL: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

type StudentRow = {
  id: string;
  household_id: string;
  location_id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  grade_level: string | null;
  lifecycle_status: string;
  internal_notes: string | null;
};

export default async function EditStudentPage({
  params,
  searchParams,
}: {
  params: { id: string; sid: string };
  searchParams: { created?: string; saved?: string; error?: string; ended?: string };
}) {
  await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, household_id, location_id, first_name, last_name, dob, grade_level, lifecycle_status, internal_notes"
    )
    .eq("id", params.sid)
    .maybeSingle();
  if (!student || student.household_id !== params.id) notFound();
  const s = student as StudentRow;

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .order("name");

  // All active time slots in this tenant, joined with classroom + location for labelling.
  const { data: slotsData } = await supabase
    .from("time_slots")
    .select(
      "id, weekday, start_time, end_time, status, classrooms!inner(id, name, status, locations!inner(id, name, status))"
    )
    .eq("status", "active");

  type SlotRowRaw = {
    id: string;
    weekday: string;
    start_time: string;
    end_time: string;
    classrooms: {
      name: string;
      status: string;
      locations: { name: string; status: string };
    };
  };

  const slotOptions: SlotOption[] = ((slotsData ?? []) as unknown as SlotRowRaw[])
    .filter(
      (slot) =>
        slot.classrooms?.status === "active" &&
        slot.classrooms?.locations?.status === "active"
    )
    .map((slot) => ({
      id: slot.id,
      label:
        `${WEEKDAY_LABEL[slot.weekday] ?? slot.weekday} ` +
        `${String(slot.start_time).slice(0, 5)}–${String(slot.end_time).slice(0, 5)} · ` +
        `${slot.classrooms.name} · ${slot.classrooms.locations.name}`,
    }));

  const { data: enrollmentsData } = await supabase
    .from("enrollments")
    .select(
      "id, effective_from, effective_to, time_slots!inner(weekday, start_time, end_time, classrooms!inner(name, locations!inner(name)))"
    )
    .eq("student_id", s.id)
    .order("effective_from", { ascending: false });

  type EnrRaw = {
    id: string;
    effective_from: string;
    effective_to: string | null;
    time_slots: {
      weekday: string;
      start_time: string;
      end_time: string;
      classrooms: { name: string; locations: { name: string } };
    };
  };
  const enrollments: EnrollmentRow[] = (
    (enrollmentsData ?? []) as unknown as EnrRaw[]
  ).map((e) => ({
    id: e.id,
    effective_from: e.effective_from,
    effective_to: e.effective_to,
    slot_label:
      `${WEEKDAY_LABEL[e.time_slots.weekday] ?? e.time_slots.weekday} ` +
      `${String(e.time_slots.start_time).slice(0, 5)}–${String(e.time_slots.end_time).slice(0, 5)} · ` +
      `${e.time_slots.classrooms.name} · ${e.time_slots.classrooms.locations.name}`,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href={`/tenant/households/${s.household_id}/edit`}
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to household
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
      {searchParams.error ? (
        <Flash kind="danger">{decodeURIComponent(searchParams.error)}</Flash>
      ) : null}

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Details
        </h2>
        <div className="mt-4">
          <EditStudentForm
            student={s}
            locations={locations ?? []}
            householdId={s.household_id}
          />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Enrollments
        </h2>
        <p className="mt-1 text-xs text-muted">
          Each enrollment ties this student to a weekly time slot. Future sessions
          materialize automatically into the Today screen.
        </p>
        <div className="mt-4">
          <EnrollmentsSection
            studentId={s.id}
            householdId={s.household_id}
            enrollments={enrollments}
            slotOptions={slotOptions}
          />
        </div>
      </section>
    </div>
  );
}

function Flash({
  kind,
  children,
}: {
  kind: "success" | "danger";
  children: React.ReactNode;
}) {
  const styles =
    kind === "success"
      ? "border-success/30 bg-success-soft text-success"
      : "border-danger/30 bg-danger/10 text-danger";
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${styles}`}>{children}</div>
  );
}
