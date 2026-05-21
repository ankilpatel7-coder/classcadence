import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus, UserPlus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { EditHouseholdForm } from "./EditHouseholdForm";
import { DeleteHouseholdButton } from "./DeleteHouseholdButton";

export const metadata = { title: "Edit household — ClassCadence" };

export const dynamic = "force-dynamic";

type Household = {
  id: string;
  primary_parent_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  secondary_parent_name: string | null;
  secondary_email: string | null;
  secondary_phone: string | null;
  mailing_address: string | null;
  notification_prefs_json: { email?: boolean; whatsapp?: boolean } | null;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  lifecycle_status: string;
};

export default async function EditHouseholdPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: {
    created?: string;
    saved?: string;
    error?: string;
    student_deleted?: string;
  };
}) {
  await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  const { data: hh } = await supabase
    .from("households")
    .select(
      "id, primary_parent_name, primary_email, primary_phone, secondary_parent_name, secondary_email, secondary_phone, mailing_address, notification_prefs_json"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!hh) notFound();

  const household = hh as Household;
  const notify = household.notification_prefs_json ?? { email: true, whatsapp: true };

  const { data: studentsData } = await supabase
    .from("students")
    .select("id, first_name, last_name, grade_level, lifecycle_status")
    .eq("household_id", household.id)
    .order("created_at", { ascending: true });

  const students = (studentsData ?? []) as Student[];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/tenant/households"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to households
      </Link>

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {household.primary_parent_name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {[household.primary_email, household.primary_phone].filter(Boolean).join(" · ") ||
              "No contact info yet"}
          </p>
        </div>
        <DeleteHouseholdButton
          householdId={household.id}
          householdName={household.primary_parent_name}
        />
      </div>

      {searchParams.created ? (
        <Flash kind="success">Household created. Add students below.</Flash>
      ) : null}
      {searchParams.saved ? <Flash kind="success">Saved.</Flash> : null}
      {searchParams.student_deleted ? (
        <Flash kind="success">Student deleted.</Flash>
      ) : null}
      {searchParams.error ? (
        <Flash kind="danger">{decodeURIComponent(searchParams.error)}</Flash>
      ) : null}

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Contact info
        </h2>
        <div className="mt-4">
          <EditHouseholdForm
            household={{
              ...household,
              notify_email: notify.email ?? true,
              notify_whatsapp: notify.whatsapp ?? true,
            }}
          />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Students
          </h2>
          <Link
            href={`/tenant/households/${household.id}/students/new`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <UserPlus className="h-4 w-4" />
            Add student
          </Link>
        </div>

        <div className="mt-4">
          {students.length === 0 ? (
            <p className="rounded-md border border-dashed border-line bg-bg/40 px-4 py-6 text-center text-sm text-muted">
              No students yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {students.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/tenant/households/${household.id}/students/${s.id}/edit`}
                    className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-2 transition hover:bg-bg"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {s.first_name} {s.last_name}
                      </p>
                      <p className="text-xs text-muted">
                        {[s.grade_level, s.lifecycle_status].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Plus className="hidden h-4 w-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
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
