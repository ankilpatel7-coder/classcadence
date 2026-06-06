import Link from "next/link";
import { MapPin, Pencil, Plus } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { locations as locationsTable } from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type LocationRow = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  iana_timezone: string;
  status: "active" | "inactive";
  created_at: string;
};

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: { deleted?: string; error?: string };
}) {
  const user = await getCurrentUserOrRedirect();

  let locations: LocationRow[] = [];
  let error: { message: string } | null = null;
  try {
    const rows = await db
      .select({
        id: locationsTable.id,
        name: locationsTable.name,
        city: locationsTable.city,
        region: locationsTable.region,
        iana_timezone: locationsTable.ianaTimezone,
        status: locationsTable.status,
        created_at: locationsTable.createdAt,
      })
      .from(locationsTable)
      .where(
        user.tenantId
          ? eq(locationsTable.tenantId, user.tenantId)
          : undefined
      )
      .orderBy(asc(locationsTable.createdAt));
    locations = rows.map((r) => ({
      ...r,
      created_at: r.created_at.toISOString(),
    }));
  } catch (err) {
    error = { message: err instanceof Error ? err.message : "Unknown error" };
  }

  const canEdit = user.role === "tenant_admin" || user.role === "super_admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Locations</h1>
          <p className="mt-1 text-sm text-muted">
            One row per physical learning center under your tenant.
          </p>
        </div>
        {canEdit ? (
          <Link href="/tenant/locations/new" className="btn-primary w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add location
          </Link>
        ) : null}
      </div>

      {searchParams.deleted ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Location deleted.
        </div>
      ) : null}

      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load locations: {error.message}
        </div>
      ) : null}

      {locations.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center shadow-card">
          <MapPin className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-3 text-sm text-muted">No locations yet.</p>
          {canEdit ? (
            <p className="mt-1 text-sm text-muted">
              Add your first one to get started.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {locations.map((l) => (
              <li
                key={l.id}
                className="rounded-lg border border-line bg-surface p-4 shadow-card"
              >
                <Link
                  href={`/tenant/locations/${l.id}/edit`}
                  className="block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-ink">
                        {l.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {[l.city, l.region].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.status === "active"
                          ? "bg-success-soft text-success"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span className="font-mono">{l.iana_timezone}</span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-lg border border-line bg-surface shadow-card md:block">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-bg">
                <tr>
                  <Th>Name</Th>
                  <Th>City / region</Th>
                  <Th>Timezone</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {locations.map((l) => (
                  <tr key={l.id}>
                    <Td>
                      <span className="font-medium text-ink">{l.name}</span>
                    </Td>
                    <Td>
                      {[l.city, l.region].filter(Boolean).join(", ") || (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    <Td className="font-mono text-xs">{l.iana_timezone}</Td>
                    <Td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          l.status === "active"
                            ? "bg-success-soft text-success"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {l.status}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <Link
                        href={`/tenant/locations/${l.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-bg"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-sm text-ink ${className}`}>{children}</td>;
}
