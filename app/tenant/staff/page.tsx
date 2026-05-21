import { redirect } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { CreateStaffForm } from "./CreateStaffForm";
import { RemoveStaffButton } from "./RemoveStaffButton";

export const metadata = { title: "Staff — ClassCadence" };
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  tenant_admin: "Tenant Admin",
  location_admin: "Location Admin",
  front_desk: "Front Desk",
};

const ROLE_BADGE: Record<string, string> = {
  tenant_admin: "bg-primary-soft text-primary-strong",
  location_admin: "bg-accent-soft text-accent",
  front_desk: "bg-success-soft text-success",
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: { removed?: string; error?: string };
}) {
  const user = await getCurrentUserOrRedirect();
  if (user.role !== "tenant_admin" && user.role !== "super_admin") {
    redirect("/tenant?error=forbidden");
  }
  if (!user.tenantId) redirect("/tenant?error=no-tenant");

  // Service-role read so we definitely get every member of this tenant —
  // user_profiles RLS already permits tenant_admin to read everyone in tenant,
  // but service role keeps intent explicit.
  const service = createSupabaseServiceClient();
  const { data: staffData } = await service
    .from("user_profiles")
    .select("id, email, full_name, role, created_at")
    .eq("tenant_id", user.tenantId)
    .order("created_at", { ascending: true });

  const staff = staffData ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Staff</h1>
        <p className="mt-1 text-sm text-muted">
          Everyone with access to your tenant. Create Front Desk and Location
          Admin accounts here.
        </p>
      </div>

      {searchParams.removed ? (
        <Flash kind="success">Staff account removed.</Flash>
      ) : null}
      {searchParams.error ? (
        <Flash kind="danger">{decodeURIComponent(searchParams.error)}</Flash>
      ) : null}

      <section className="rounded-lg border border-line bg-surface p-4 shadow-card md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Existing staff
        </h2>
        <ul className="mt-3 divide-y divide-line">
          {staff.length === 0 ? (
            <li className="px-2 py-4 text-sm text-muted">
              No staff yet. Add someone below.
            </li>
          ) : (
            staff.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 px-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {s.full_name || s.email}
                  </p>
                  <p className="truncate text-xs text-muted">{s.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ROLE_BADGE[s.role] ?? "bg-line text-muted"
                    }`}
                  >
                    {ROLE_LABEL[s.role] ?? s.role}
                  </span>
                  {s.role === "tenant_admin" || s.id === user.id ? null : (
                    <RemoveStaffButton
                      staffId={s.id}
                      staffName={s.full_name || s.email}
                    />
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4 shadow-card md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Add staff member
        </h2>
        <p className="mt-1 text-xs text-muted">
          Creates the login account directly. You&apos;ll see the credentials after
          submit — share them with the staff member out-of-band (text, in person).
        </p>
        <div className="mt-4">
          <CreateStaffForm />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4 shadow-card md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          What each role can do
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-ink">
          <RoleRow
            badge="Tenant Admin"
            badgeClass="bg-primary-soft text-primary-strong"
          >
            Full access including locations, classrooms, settings, and inviting
            other staff.
          </RoleRow>
          <RoleRow badge="Location Admin" badgeClass="bg-accent-soft text-accent">
            Can manage classrooms, time slots, operating hours, holidays, and
            attendance for any location. Cannot add or delete locations or change
            tenant settings.
          </RoleRow>
          <RoleRow badge="Front Desk" badgeClass="bg-success-soft text-success">
            Daily operations: register new students, manage households, run
            check-in / check-out on the Today screen. Read-only on locations and
            schedules.
          </RoleRow>
        </ul>
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

function RoleRow({
  badge,
  badgeClass,
  children,
}: {
  badge: string;
  badgeClass: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-line bg-bg/40 p-3 sm:flex-row sm:items-start">
      <span
        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}
      >
        {badge}
      </span>
      <p className="text-xs text-muted">{children}</p>
    </li>
  );
}
