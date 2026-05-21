import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { getTimezoneGroups } from "@/lib/timezones";
import { EditLocationForm } from "./EditLocationForm";
import { HoursEditor, type HoursWindow } from "./HoursEditor";
import { HolidaysEditor, type Holiday } from "./HolidaysEditor";
import { DeleteLocationButton } from "./DeleteLocationButton";

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
  };
}) {
  const user = await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  const { data: location, error } = await supabase
    .from("locations")
    .select(
      "id, name, address_line1, address_line2, city, region, postal_code, country, iana_timezone, phone, support_email, status"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !location) notFound();
  const loc = location as LocationRow;

  const [{ data: hoursData }, { data: holidaysData }] = await Promise.all([
    supabase
      .from("operating_hours_rules")
      .select("weekday, open_time, close_time")
      .eq("location_id", loc.id),
    supabase
      .from("holiday_closures")
      .select("id, start_date, end_date, reason")
      .eq("location_id", loc.id)
      .order("start_date", { ascending: true }),
  ]);

  const hours = (hoursData ?? []).map((r) => ({
    weekday: r.weekday as HoursWindow["weekday"],
    // Postgres time may come back as "09:00:00" — trim to "HH:MM" for <input type="time">.
    open_time: String(r.open_time).slice(0, 5),
    close_time: String(r.close_time).slice(0, 5),
  })) as HoursWindow[];

  const holidays = (holidaysData ?? []) as Holiday[];
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
