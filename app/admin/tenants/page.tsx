import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants as tenantsTable } from "@/lib/db/schema";
import { DeleteTenantButton } from "./DeleteTenantButton";

export const dynamic = "force-dynamic";

type TenantRow = {
  id: string;
  name: string;
  legal_name: string | null;
  default_iana_tz: string;
  country: string;
  status: "active" | "suspended";
  created_at: string;
};

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: { deleted?: string; error?: string };
}) {
  let tenants: TenantRow[] = [];
  let error: { message: string } | null = null;
  try {
    const rows = await db
      .select({
        id: tenantsTable.id,
        name: tenantsTable.name,
        legal_name: tenantsTable.legalName,
        default_iana_tz: tenantsTable.defaultIanaTz,
        country: tenantsTable.country,
        status: tenantsTable.status,
        created_at: tenantsTable.createdAt,
      })
      .from(tenantsTable)
      .orderBy(desc(tenantsTable.createdAt));
    tenants = rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }));
  } catch (err) {
    error = { message: err instanceof Error ? err.message : "Unknown error" };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tenants</h1>
          <p className="mt-1 text-sm text-muted">
            All learning centers on the ClassCadence platform.
          </p>
        </div>
        <Link href="/admin/tenants/new" className="btn-primary w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Create tenant
        </Link>
      </div>

      {searchParams.deleted ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Tenant deleted.
        </div>
      ) : null}

      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load tenants: {error.message}
        </div>
      ) : null}

      {tenants.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center shadow-card">
          <p className="text-sm text-muted">No tenants yet.</p>
          <p className="mt-1 text-sm text-muted">
            Create the first one to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Card layout — small screens */}
          <ul className="space-y-3 md:hidden">
            {tenants.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-line bg-surface p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-ink">
                      {t.name}
                    </p>
                    {t.legal_name ? (
                      <p className="truncate text-xs text-muted">{t.legal_name}</p>
                    ) : null}
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
                  <div className="flex flex-col">
                    <dt className="uppercase tracking-wider">Timezone</dt>
                    <dd className="font-mono text-ink">{t.default_iana_tz}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="uppercase tracking-wider">Country</dt>
                    <dd className="text-ink">{t.country}</dd>
                  </div>
                  <div className="col-span-2 flex flex-col">
                    <dt className="uppercase tracking-wider">Created</dt>
                    <dd className="text-ink">
                      {new Date(t.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/tenants/${t.id}/edit`}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:bg-bg"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                  <DeleteTenantButton tenantId={t.id} tenantName={t.name} />
                </div>
              </li>
            ))}
          </ul>

          {/* Table layout — md and up */}
          <div className="hidden overflow-hidden rounded-lg border border-line bg-surface shadow-card md:block">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-bg">
                <tr>
                  <Th>Name</Th>
                  <Th>Legal name</Th>
                  <Th>Timezone</Th>
                  <Th>Country</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <span className="font-medium text-ink">{t.name}</span>
                    </Td>
                    <Td>{t.legal_name || <span className="text-muted">—</span>}</Td>
                    <Td className="font-mono text-xs">{t.default_iana_tz}</Td>
                    <Td>{t.country}</Td>
                    <Td>
                      <StatusBadge status={t.status} />
                    </Td>
                    <Td className="text-muted">
                      {new Date(t.created_at).toLocaleDateString()}
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/tenants/${t.id}/edit`}
                          className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-bg"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <DeleteTenantButton tenantId={t.id} tenantName={t.name} />
                      </div>
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

function StatusBadge({ status }: { status: "active" | "suspended" }) {
  const styles =
    status === "active"
      ? "bg-success-soft text-success"
      : "bg-warning/10 text-warning";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      {status}
    </span>
  );
}
