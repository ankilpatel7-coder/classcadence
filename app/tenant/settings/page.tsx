import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import {
  DatabaseLink,
  MaterializeButton,
  SeedDemoButton,
  WipeAllButton,
  WipeDemoButton,
} from "./SettingsActions";
import { BrandingForm } from "./BrandingForm";

export const metadata = { title: "Settings — ClassCadence" };
export const dynamic = "force-dynamic";

async function countOf(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  table: string
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

const TIER_LIMITS = {
  database_mb: 500,
  storage_gb: 1,
  monthly_active_users: 50_000,
  bandwidth_gb: 5,
  emails_per_hour: 4,
  emails_per_day: 30,
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const user = await getCurrentUserOrRedirect();
  if (user.role !== "tenant_admin" && user.role !== "super_admin") {
    // location_admin / front_desk shouldn't see this page.
    return (
      <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
        Only Tenant Admins can manage settings.
      </div>
    );
  }

  const supabase = createSupabaseServerClient();

  const [
    locationCount,
    classroomCount,
    timeSlotCount,
    studentCount,
    enrollmentCount,
    sessionCount,
    attendanceCount,
  ] = await Promise.all([
    countOf(supabase, "locations"),
    countOf(supabase, "classrooms"),
    countOf(supabase, "time_slots"),
    countOf(supabase, "students"),
    countOf(supabase, "enrollments"),
    countOf(supabase, "sessions"),
    countOf(supabase, "attendance_records"),
  ]);

  // Quick rough estimate of row count to give a "you're nowhere near the
  // 500 MB cap" gut check. Actual storage is checked in the Supabase dashboard.
  const totalRows =
    locationCount +
    classroomCount +
    timeSlotCount +
    studentCount +
    enrollmentCount +
    sessionCount +
    attendanceCount;

  const { data: branding } = await supabase
    .from("branding_assets")
    .select("primary_color_hex, logo_url, sender_display_name")
    .eq("tenant_id", user.tenantId)
    .maybeSingle();

  const seededHouseholds = searchParams.seeded_households;
  const wipedAll = searchParams.wiped_all;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Operations console for {user.fullName || user.email}.
        </p>
      </div>

      {seededHouseholds ? (
        <Flash kind="success">
          Demo data seeded: {searchParams.seeded_households} households,{" "}
          {searchParams.seeded_students} students,{" "}
          {searchParams.seeded_enrollments} enrollments,{" "}
          {searchParams.materialized_sessions} sessions,{" "}
          {searchParams.materialized_attendance} attendance rows.
        </Flash>
      ) : null}
      {searchParams.wiped_households ? (
        <Flash kind="success">
          Demo data wiped: {searchParams.wiped_households} households,{" "}
          {searchParams.wiped_students} students.
        </Flash>
      ) : null}
      {wipedAll ? (
        <Flash kind="success">
          All students and households deleted for this tenant. Locations,
          classrooms, and time slots are preserved.
        </Flash>
      ) : null}
      {searchParams.materialized_sessions && !seededHouseholds ? (
        <Flash kind="success">
          Materialized {searchParams.materialized_sessions} sessions and{" "}
          {searchParams.materialized_attendance} attendance rows for the next
          14 days.
        </Flash>
      ) : null}
      {searchParams.error ? (
        <Flash kind="danger">{decodeURIComponent(searchParams.error)}</Flash>
      ) : null}

      <Card title="Live counts">
        <p className="mb-3 text-xs text-muted">
          Approximate row totals visible to this tenant.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Locations" value={locationCount} />
          <Stat label="Classrooms" value={classroomCount} />
          <Stat label="Time slots" value={timeSlotCount} />
          <Stat label="Students" value={studentCount} />
          <Stat label="Enrollments" value={enrollmentCount} />
          <Stat label="Sessions" value={sessionCount} />
          <Stat label="Attendance" value={attendanceCount} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Total rows tracked here: <span className="font-mono">{totalRows}</span>.
        </p>
      </Card>

      <Card title="Operations">
        <p className="mb-4 text-xs text-muted">
          Materialization turns your weekly time slots + enrollments into
          concrete sessions for the next 14 days. Run it after adding new time
          slots or enrollments. (Eventually this runs on a schedule via
          Inngest.)
        </p>
        <MaterializeButton />
      </Card>

      <Card title="Branding">
        <p className="mb-4 text-sm text-muted">
          Tweak the primary color and logo used inside your tenant. Changes apply
          across this tenant only — other centers on ClassCadence keep their own.
        </p>
        <BrandingForm
          defaults={{
            primary_color_hex: branding?.primary_color_hex ?? "#1AA876",
            logo_url: branding?.logo_url ?? "",
            sender_display_name: branding?.sender_display_name ?? "",
          }}
        />
      </Card>

      <Card title="Demo data">
        <p className="mb-4 text-sm text-muted">
          Seeds a few realistic households and students so the Today screen has
          something to render. All demo students are tagged so you can wipe
          them in one shot without touching real data.
        </p>
        <div className="flex flex-wrap gap-3">
          <SeedDemoButton />
          <WipeDemoButton />
        </div>
      </Card>

      <Card title="Danger zone" tone="danger">
        <p className="mb-4 text-sm text-muted">
          One-click reset for testing. Wipes every household + student +
          enrollment + attendance record for this tenant. Locations,
          classrooms, time slots, and operating hours are kept.
        </p>
        <WipeAllButton />
      </Card>

      <Card title="Free-tier usage">
        <p className="mb-4 text-sm text-muted">
          Live storage / bandwidth numbers can only be read from the Supabase
          dashboard. The link below opens the Database usage page for this
          project.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <LimitRow label="Postgres storage" limit={`${TIER_LIMITS.database_mb} MB`} />
          <LimitRow label="File storage" limit={`${TIER_LIMITS.storage_gb} GB`} />
          <LimitRow
            label="Monthly active users"
            limit={TIER_LIMITS.monthly_active_users.toLocaleString()}
          />
          <LimitRow label="Bandwidth / month" limit={`${TIER_LIMITS.bandwidth_gb} GB`} />
          <LimitRow
            label="Auth invite emails / hour"
            limit={`${TIER_LIMITS.emails_per_hour} (default sender)`}
          />
          <LimitRow
            label="Auth invite emails / day"
            limit={`${TIER_LIMITS.emails_per_day} (default sender)`}
          />
        </div>
        <div className="mt-4">
          <DatabaseLink />
        </div>
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  const border =
    tone === "danger" ? "border-danger/30 bg-danger/5" : "border-line bg-surface";
  return (
    <section className={`rounded-lg border p-6 shadow-card ${border}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-bg/60 p-3 shadow-press">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink tnum">
        {value}
      </p>
    </div>
  );
}

function LimitRow({ label, limit }: { label: string; limit: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-line bg-bg/40 px-3 py-2 text-sm">
      <span className="text-ink">{label}</span>
      <span className="font-mono text-xs text-muted">{limit}</span>
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
