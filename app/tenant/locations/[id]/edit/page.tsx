import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  locations as locationsTable,
  operatingHoursRules,
  holidayClosures,
  classrooms as classroomsTable,
  timeSlots,
} from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { getTimezoneGroups } from "@/lib/timezones";
import { EditLocationForm } from "./EditLocationForm";
import { HoursEditor, type HoursWindow } from "./HoursEditor";
import { HolidaysEditor, type Holiday } from "./HolidaysEditor";
import { DeleteLocationButton } from "./DeleteLocationButton";

type ClassroomSummary = {
  id: string;
  name: string;
  default_capacity: number;
  color: string;
  status: "active" | "inactive";
  slot_count: number;
};

export const metadata = { title: "Edit location — ClassCadence" };

export const dynamic = "force-dynamic";

type LocationRow = {
  id: string;
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;
  iana_timezone: string;
  phone: string | null;
  support_email: string | null;
  status: "active" | "inactive";
  max_classes_per_student_per_week: number;
};

export default async function EditLocationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: {
    created?: string;
    saved?: string;
    error?: string;
    holiday_deleted?: string;
    classroom_deleted?: string;
  };
}) {
  const user = await getCurrentUserOrRedirect();

  // App-level tenant scoping: the owner connection bypasses RLS, so filter by
  // the caller's tenantId (super_admin may act across tenants).
  const [location] = await db
    .select({
      id: locationsTable.id,
      name: locationsTable.name,
      address_line1: locationsTable.addressLine1,
      address_line2: locationsTable.addressLine2,
      city: locationsTable.city,
      region: locationsTable.region,
      postal_code: locationsTable.postalCode,
      country: locationsTable.country,
      iana_timezone: locationsTable.ianaTimezone,
      phone: locationsTable.phone,
      support_email: locationsTable.supportEmail,
      status: locationsTable.status,
      max_classes_per_student_per_week:
        locationsTable.maxClassesPerStudentPerWeek,
    })
    .from(locationsTable)
    .where(
      user.tenantId
        ? and(
            eq(locationsTable.id, params.id),
            eq(locationsTable.tenantId, user.tenantId)
          )
        : eq(locationsTable.id, params.id)
    )
    .limit(1);

  if (!location) notFound();
  const loc = location as LocationRow;

  const [hoursData, holidaysData, classroomsData, slotRows] = await Promise.all([
    db
      .select({
        weekday: operatingHoursRules.weekday,
        open_time: operatingHoursRules.openTime,
        close_time: operatingHoursRules.closeTime,
      })
      .from(operatingHoursRules)
      .where(eq(operatingHoursRules.locationId, loc.id)),
    db
      .select({
        id: holidayClosures.id,
        start_date: holidayClosures.startDate,
        end_date: holidayClosures.endDate,
        reason: holidayClosures.reason,
      })
      .from(holidayClosures)
      .where(eq(holidayClosures.locationId, loc.id))
      .orderBy(asc(holidayClosures.startDate)),
    db
      .select({
        id: classroomsTable.id,
        name: classroomsTable.name,
        default_capacity: classroomsTable.defaultCapacity,
        color: classroomsTable.color,
        status: classroomsTable.status,
      })
      .from(classroomsTable)
      .where(eq(classroomsTable.locationId, loc.id))
      .orderBy(asc(classroomsTable.createdAt)),
    db
      .select({
        id: timeSlots.id,
        classroomId: timeSlots.classroomId,
      })
      .from(timeSlots)
      .innerJoin(
        classroomsTable,
        eq(timeSlots.classroomId, classroomsTable.id)
      )
      .where(eq(classroomsTable.locationId, loc.id)),
  ]);

  const slotCounts = new Map<string, number>();
  for (const s of slotRows) {
    slotCounts.set(s.classroomId, (slotCounts.get(s.classroomId) ?? 0) + 1);
  }

  const classrooms: ClassroomSummary[] = classroomsData.map((c) => ({
    id: c.id,
    name: c.name,
    default_capacity: c.default_capacity,
    color: c.color ?? "#1E3A8A",
    status: c.status as "active" | "inactive",
    slot_count: slotCounts.get(c.id) ?? 0,
  }));

  const hours = hoursData.map((r) => ({
    weekday: r.weekday as HoursWindow["weekday"],
    // Postgres time may come back as "09:00:00" — trim to "HH:MM" for <input type="time">.
    open_time: String(r.open_time).slice(0, 5),
    close_time: String(r.close_time).slice(0, 5),
  })) as HoursWindow[];

  const holidays = holidaysData as Holiday[];
  const timezoneGroups = getTimezoneGroups();
  const canEdit = user.role === "tenant_admin" || user.role === "super_admin";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/tenant/locations"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to locations
      </Link>

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{loc.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Manage this location&apos;s details, weekly hours, and closures.
          </p>
        </div>
        {canEdit ? (
          <DeleteLocationButton locationId={loc.id} locationName={loc.name} />
        ) : null}
      </div>

      {searchParams.created ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Location created. Add weekly hours below so sessions can be materialized.
        </div>
      ) : null}
      {searchParams.saved ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Location saved.
        </div>
      ) : null}
      {searchParams.holiday_deleted ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Closure removed.
        </div>
      ) : null}
      {searchParams.classroom_deleted ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Classroom deleted.
        </div>
      ) : null}
      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Details
        </h2>
        <div className="mt-4">
          <EditLocationForm location={loc} timezoneGroups={timezoneGroups} />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Weekly hours
        </h2>
        <p className="mt-1 text-xs text-muted">
          Add one or more open–close windows per day. Days with no windows are treated
          as closed. Times are local to{" "}
          <span className="font-mono">{loc.iana_timezone}</span>.
        </p>
        <div className="mt-4">
          <HoursEditor locationId={loc.id} initialRules={hours} />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Classrooms
          </h2>
          {canEdit ? (
            <Link
              href={`/tenant/locations/${loc.id}/classrooms/new`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="h-4 w-4" />
              Add classroom
            </Link>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted">
          Rooms inside this location. Each holds its own weekly time slots.
        </p>

        <div className="mt-4 space-y-2">
          {classrooms.length === 0 ? (
            <p className="rounded-md border border-dashed border-line bg-bg/40 px-4 py-6 text-center text-sm text-muted">
              No classrooms yet. Add one to start setting up weekly time slots.
            </p>
          ) : (
            <ul className="space-y-2">
              {classrooms.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/tenant/locations/${loc.id}/classrooms/${c.id}/edit`}
                    className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3 transition hover:bg-bg"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        style={{ backgroundColor: c.color }}
                        className="h-6 w-6 rounded-md border border-line"
                      />
                      <div>
                        <p className="text-sm font-medium text-ink">{c.name}</p>
                        <p className="text-xs text-muted">
                          {c.slot_count} slot{c.slot_count === 1 ? "" : "s"}
                          {" · "}
                          capacity {c.default_capacity}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "active"
                          ? "bg-success-soft text-success"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {c.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Holiday closures
        </h2>
        <p className="mt-1 text-xs text-muted">
          Date ranges when the location is closed regardless of the weekly schedule.
        </p>
        <div className="mt-4">
          <HolidaysEditor locationId={loc.id} holidays={holidays} />
        </div>
      </section>
    </div>
  );
}
