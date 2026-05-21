import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { EditClassroomForm } from "./EditClassroomForm";
import { DeleteClassroomButton } from "./DeleteClassroomButton";
import {
  TimeSlotsEditor,
  type HoursWindow,
  type Slot,
} from "./TimeSlotsEditor";

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
  const supabase = createSupabaseServerClient();

  const { data: classroom } = await supabase
    .from("classrooms")
    .select(
      "id, location_id, name, description, default_capacity, color, status"
    )
    .eq("id", params.cid)
    .maybeSingle();

  if (!classroom || classroom.location_id !== params.id) notFound();
  const room = classroom as ClassroomRow;

  const { data: location } = await supabase
    .from("locations")
    .select("name")
    .eq("id", params.id)
    .maybeSingle();

  const [{ data: hoursData }, { data: slotsData }] = await Promise.all([
    supabase
      .from("operating_hours_rules")
      .select("weekday, open_time, close_time")
      .eq("location_id", params.id),
    supabase
      .from("time_slots")
      .select("weekday, start_time, end_time, capacity_override, notes")
      .eq("classroom_id", params.cid)
      .eq("status", "active"),
  ]);

  const operatingHours = (hoursData ?? []).map((h) => ({
    weekday: h.weekday as Weekday,
    open_time: String(h.open_time).slice(0, 5),
    close_time: String(h.close_time).slice(0, 5),
  })) as HoursWindow[];

  const slots = (slotsData ?? []).map((s) => ({
    weekday: s.weekday as Weekday,
    start_time: String(s.start_time).slice(0, 5),
    end_time: String(s.end_time).slice(0, 5),
    capacity_override: s.capacity_override,
    notes: s.notes,
  })) as Slot[];

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
          Each slot is a recurring window when this classroom runs. Slots must
          sit inside the location&apos;s operating hours for the same weekday.
          Leave the capacity field blank to use the classroom default
          ({room.default_capacity}).
        </p>
        <div className="mt-4">
          {operatingHours.length === 0 ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
              No operating hours set for this location yet. Add them on the
              location page first — slot creation is disabled until then.
            </div>
          ) : null}
          <TimeSlotsEditor
            classroomId={room.id}
            locationId={room.location_id}
            defaultCapacity={room.default_capacity}
            initialSlots={slots}
            operatingHours={operatingHours}
          />
        </div>
      </section>
    </div>
  );
}
