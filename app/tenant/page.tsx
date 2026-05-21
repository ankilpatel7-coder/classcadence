import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function TenantHomePage() {
  const user = await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, status, city, region")
    .order("created_at", { ascending: true });

  const list = locations ?? [];
  const activeCount = list.filter((l) => l.status === "active").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Welcome{user.fullName ? `, ${user.fullName}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-muted">
          Set up your learning center so your team can start checking students in.
        </p>
      </div>

      {list.length === 0 ? (
        <FirstLocationCard />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Locations" value={list.length.toString()} />
          <StatCard label="Active" value={activeCount.toString()} />
          <StatCard label="Inactive" value={(list.length - activeCount).toString()} />
        </div>
      )}

      {list.length > 0 ? (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-semibold text-ink">Your locations</h2>
            <Link
              href="/tenant/locations/new"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="h-4 w-4" />
              Add another
            </Link>
          </div>
          <ul className="space-y-2">
            {list.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/tenant/locations/${l.id}/edit`}
                  className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3 shadow-card transition hover:bg-bg"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-sm font-medium text-ink">{l.name}</p>
                      <p className="text-xs text-muted">
                        {[l.city, l.region].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      l.status === "active"
                        ? "bg-success-soft text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {l.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-ink tnum">{value}</p>
    </div>
  );
}

function FirstLocationCard() {
  return (
    <section className="rounded-lg border border-dashed border-primary/30 bg-primary-soft/40 p-8 text-center">
      <h2 className="text-lg font-semibold text-ink">
        Let&apos;s add your first location.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        A location is one physical learning center. It has its own timezone, address,
        and weekly operating hours. You can add more later.
      </p>
      <Link
        href="/tenant/locations/new"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition hover:bg-primary-strong"
      >
        <Plus className="h-4 w-4" />
        Add a location
      </Link>
    </section>
  );
}
