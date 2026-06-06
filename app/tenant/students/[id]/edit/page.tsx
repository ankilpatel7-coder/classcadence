import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { and, asc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  students,
  locations,
  enrollments,
  timeSlots,
  classrooms,
} from "@/lib/db/schema";
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
  const user = await getCurrentUserOrRedirect();

  // App-level tenant isolation: scope the student lookup to this tenant.
  const [student] = await db
    .select({
      id: students.id,
      location_id: students.locationId,
      first_name: students.firstName,
      last_name: students.lastName,
      dob: students.dob,
      grade_level: students.gradeLevel,
      lifecycle_status: students.lifecycleStatus,
      internal_notes: students.internalNotes,
      primary_parent_name: students.primaryParentName,
      primary_email: students.primaryEmail,
      primary_phone: students.primaryPhone,
      secondary_parent_name: students.secondaryParentName,
      secondary_email: students.secondaryEmail,
      secondary_phone: students.secondaryPhone,
      mailing_address: students.mailingAddress,
      notification_prefs_json: students.notificationPrefsJson,
    })
    .from(students)
    .where(and(eq(students.id, params.id), eq(students.tenantId, user.tenantId!)))
    .limit(1);
  if (!student) notFound();
  const s = student as StudentRow;
  const notify =
    (s.notification_prefs_json as { email?: boolean; whatsapp?: boolean } | null) ?? {
      email: true,
      whatsapp: true,
    };

  // Only this tenant's locations.
  const locationsList = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(eq(locations.tenantId, user.tenantId!))
    .orderBy(asc(locations.name));

  const today = new Date().toISOString().slice(0, 10);

  // 1) Every active enrollment for this student — shown at the top of the
  //    section so the front desk can see exactly what they're enrolled in
  //    (even if the slot's classroom/location has been deactivated since).
  const myEnrollmentsRaw = await db
    .select({
      id: enrollments.id,
      weekday: timeSlots.weekday,
      start_time: timeSlots.startTime,
      end_time: timeSlots.endTime,
      classroom_id: classrooms.id,
      classroom_name: classrooms.name,
      classroom_color: classrooms.color,
      location_name: locations.name,
    })
    .from(enrollments)
    .innerJoin(timeSlots, eq(timeSlots.id, enrollments.timeSlotId))
    .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .where(
      and(
        eq(enrollments.studentId, s.id),
        or(isNull(enrollments.effectiveTo), gt(enrollments.effectiveTo, today))
      )
    );

  const currentEnrollments: CurrentEnrollment[] = myEnrollmentsRaw.map((e) => ({
    enrollment_id: e.id,
    weekday: e.weekday as EWeekday,
    start_time: String(e.start_time).slice(0, 5),
    end_time: String(e.end_time).slice(0, 5),
    classroom_id: e.classroom_id,
    classroom_name: e.classroom_name,
    classroom_color: e.classroom_color ?? "#1E3A8A",
    location_name: e.location_name,
  }));

  // The first (any) enrollment's classroom locks the wizard. If the student
  // is in no classes, the picker shows every active classroom.
  const lockedClassroomId =
    currentEnrollments.length > 0 ? currentEnrollments[0].classroom_id : null;

  // 2) Active classrooms with their active slots + capacity counts. This
  //    drives the classroom -> day -> time wizard. Scoped to this tenant
  //    through the location join; only active classrooms at active locations.
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

  const classroomRows = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      color: classrooms.color,
      default_capacity: classrooms.defaultCapacity,
      loc_id: locations.id,
      loc_name: locations.name,
      loc_status: locations.status,
      loc_max: locations.maxClassesPerStudentPerWeek,
      slot_id: timeSlots.id,
      slot_weekday: timeSlots.weekday,
      slot_start_time: timeSlots.startTime,
      slot_end_time: timeSlots.endTime,
      slot_capacity_override: timeSlots.capacityOverride,
      slot_status: timeSlots.status,
    })
    .from(classrooms)
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .leftJoin(timeSlots, eq(timeSlots.classroomId, classrooms.id))
    .where(
      and(
        eq(classrooms.status, "active"),
        eq(locations.status, "active"),
        eq(locations.tenantId, user.tenantId!)
      )
    );

  // Regroup the flat classroom × slot rows back into the nested shape the
  // wizard expects.
  const classroomMap = new Map<string, ClassroomRaw>();
  for (const r of classroomRows) {
    let c = classroomMap.get(r.id);
    if (!c) {
      c = {
        id: r.id,
        name: r.name,
        color: r.color ?? "#1E3A8A",
        default_capacity: r.default_capacity,
        locations: {
          id: r.loc_id,
          name: r.loc_name,
          status: r.loc_status,
          max_classes_per_student_per_week: r.loc_max,
        },
        time_slots: [],
      };
      classroomMap.set(r.id, c);
    }
    if (r.slot_id) {
      c.time_slots.push({
        id: r.slot_id,
        weekday: r.slot_weekday as string,
        start_time: String(r.slot_start_time),
        end_time: String(r.slot_end_time),
        capacity_override: r.slot_capacity_override,
        status: r.slot_status as string,
      });
    }
  }
  const activeClassrooms = Array.from(classroomMap.values());

  // Collect slot ids to count enrollments per slot.
  const allSlotIds = activeClassrooms.flatMap((c) =>
    (c.time_slots ?? []).filter((t) => t.status === "active").map((t) => t.id)
  );
  const slotCounts = new Map<string, number>();
  if (allSlotIds.length > 0) {
    const counts = await db
      .select({ time_slot_id: enrollments.timeSlotId })
      .from(enrollments)
      .where(
        and(
          inArray(enrollments.timeSlotId, allSlotIds),
          or(isNull(enrollments.effectiveTo), gt(enrollments.effectiveTo, today))
        )
      );
    for (const c of counts) {
      const id = c.time_slot_id;
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
          locations={locationsList}
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
