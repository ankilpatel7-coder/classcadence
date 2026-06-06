import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classrooms,
  locations,
  operatingHoursRules,
  timeSlots,
} from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { EditClassroomForm } from "./EditClassroomForm";
import { DeleteClassroomButton } from "./DeleteClassroomButton";
import {
  TimeSlotsGridEditor,
  type HoursWindow,
  type ExistingSlot,
} from "./TimeSlotsGridEditor";

export const metadata = { title: "Edit classroom — ClassCadence" };

export const dynamic = "force-dynamic";

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type ClassroomRow = {
  id: string;
  location_id: string;
  name: string;
  description: string | null;
  default_capacity: number;
  color: string;
  status: "active" | "inactive";
};

export default async function EditClassroomPage({
  params,
  searchParams,
}: {
  params: { id: string; cid: string };
  searchParams: { created?: string; saved?: string; error?: string };
}) {
  const user = await getCurrentUserOrRedirect();

  // App-level tenant scoping: join classroom -> location and filter by the
  // caller's tenantId (owner connection bypasses RLS). super_admin (null
  // tenantId) may act across tenants.
  const [classroom] = await db
    .select({
      id: classrooms.id,
      location_id: classrooms.locationId,
      name: classrooms.name,
      description: classrooms.description,
      default_capacity: classrooms.defaultCapacity,
      color: classrooms.color,
      status: classrooms.status,
      location_name: locations.name,
    })
    .from(classrooms)
    .innerJoin(locations, eq(classrooms.locationId, locations.id))
    .where(
      user.tenantId
        ? and(
            eq(classrooms.id, params.cid),
            eq(locations.tenantId, user.tenantId)
          )
        : eq(classrooms.id, params.cid)
    )
    .limit(1);

  if (!classroom || classroom.location_id !== params.id) notFound();
  const room: ClassroomRow = {
    id: classroom.id,
    location_id: classroom.location_id,
    name: classroom.name,
    description: classroom.description,
    default_capacity: classroom.default_capacity,
    color: classroom.color ?? "#1E3A8A",
    status: classroom.status as "active" | "inactive",
  };

  const location = { name: classroom.location_name };

  const [hoursData, slotsData] = await Promise.all([
    db
      .select({
        weekday: operatingHoursRules.weekday,
        open_time: operatingHoursRules.openTime,
        close_time: operatingHoursRules.closeTime,
      })
      .from(operatingHoursRules)
      .where(eq(operatingHoursRules.locationId, params.id)),
    db
      .select({
        id: timeSlots.id,
        weekday: timeSlots.weekday,
        start_time: timeSlots.startTime,
        end_time: timeSlots.endTime,
      })
      .from(timeSlots)
      .where(
        and(
          eq(timeSlots.classroomId, params.cid),
          eq(timeSlots.status, "active")
        )
      ),
  ]);

  const operatingHours = hoursData.map((h) => ({
    weekday: h.weekday as Weekday,
    open_time: String(h.open_time).slice(0, 5),
    close_time: String(h.close_time).slice(0, 5),
  })) as HoursWindow[];

  const slots = slotsData.map((s) => ({
    id: s.id,
    weekday: s.weekday as Weekday,
    start_time: String(s.start_time).slice(0, 5),
    end_time: String(s.end_time).slice(0, 5),
  })) as ExistingSlot[];

  const canEdit =
    user.role === "tenant_admin" ||
    user.role === "location_admin" ||
    user.role === "super_admin";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href={`/tenant/locations/${room.location_id}/edit`}
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {location?.name ?? "location"}
      </Link>

      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            style={{ backgroundColor: room.color }}
            className="h-8 w-8 rounded-md border border-line"
          />
          <div>
            <h1 className="text-2xl font-semibold text-ink">{room.name}</h1>
            <p className="mt-1 text-sm text-muted">
              Default capacity {room.default_capacity}. Status {room.status}.
            </p>
          </div>
        </div>
        {canEdit ? (
          <DeleteClassroomButton
            classroomId={room.id}
            locationId={room.location_id}
            classroomName={room.name}
          />
        ) : null}
      </div>

      {searchParams.created ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Classroom created. Add weekly time slots below.
        </div>
      ) : null}
      {searchParams.saved ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Classroom saved.
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
          <EditClassroomForm classroom={room} locationId={room.location_id} />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Weekly time slots
        </h2>
        <p className="mt-1 text-xs text-muted">
          Tap any 30-minute cell during operating hours to make it a recurring
          slot for this classroom. Tap an existing slot to mark it for removal.
          Default capacity {room.default_capacity}.
        </p>
        <div className="mt-4">
          <TimeSlotsGridEditor
            classroomId={room.id}
            locationId={room.location_id}
            classroomColor={room.color}
            operatingHours={operatingHours}
            existingSlots={slots}
          />
        </div>
      </section>
    </div>
  );
}
