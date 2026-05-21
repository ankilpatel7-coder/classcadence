import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { EditTenantForm } from "./EditTenantForm";
import { AdminRow } from "./AdminRow";
import { InviteAdminForm } from "./InviteAdminForm";

export const metadata = {
  title: "Edit tenant — ClassCadence",
};

export const dynamic = "force-dynamic";

type AdminRecord = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

export default async function EditTenantPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { removed?: string; error?: string; invite_error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, name, legal_name, default_iana_tz, country, status")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !tenant) notFound();

  // Service-role read: avoids fighting RLS for cross-tenant profile listings
  // (super_admin can read all, but using the service client keeps intent clear).
  const service = createSupabaseServiceClient();
  const { data: adminsData } = await service
    .from("user_profiles")
    .select("id, email, full_name, created_at")
    .eq("tenant_id", tenant.id)
    .in("role", ["tenant_admin", "location_admin"])
    .order("created_at", { ascending: true });

  const admins = (adminsData ?? []) as AdminRecord[];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/admin/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to tenants
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-ink">Edit tenant</h1>
        <p className="mt-1 text-sm text-muted">
          Update the tenant&apos;s details or change its operating status.
        </p>
      </div>

      {searchParams.removed ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Admin removed.
        </div>
      ) : null}

      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {searchParams.invite_error ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
          <p className="font-medium">The tenant was created, but the admin invite failed.</p>
          <p className="mt-1 text-sm">{decodeURIComponent(searchParams.invite_error)}</p>
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Tenant details
        </h2>
        <div className="mt-4">
          <EditTenantForm tenant={tenant} />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Admins
        </h2>
        <p className="mt-1 text-xs text-muted">
          Tenant and location admins for this learning center. Email is read-only —
          to use a different address, remove the admin and invite again.
        </p>

        <div className="mt-4 space-y-3">
          {admins.length === 0 ? (
            <p className="rounded-md border border-dashed border-line bg-bg/40 px-4 py-6 text-center text-sm text-muted">
              No admins yet. Invite one below.
            </p>
          ) : (
            admins.map((admin) => (
              <AdminRow key={admin.id} admin={admin} tenantId={tenant.id} />
            ))
          )}
        </div>

        <div className="mt-6 rounded-md border border-line bg-bg/40 p-4">
          <h3 className="text-sm font-medium text-ink">Invite another admin</h3>
          <p className="mt-1 text-xs text-muted">
            They&apos;ll receive an email titled &quot;You have been invited&quot; with a
            link to set their password.
          </p>
          <div className="mt-4">
            <InviteAdminForm tenantId={tenant.id} />
          </div>
        </div>
      </section>
    </div>
  );
}
