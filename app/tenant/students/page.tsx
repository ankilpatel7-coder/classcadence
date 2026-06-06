import Link from "next/link";
import { GraduationCap, Pencil, Plus } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { students, locations } from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  lifecycle_status: string;
  primary_parent_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  locations: { id: string; name: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  lead: "bg-line text-muted",
  trial: "bg-warning/10 text-warning",
  active: "bg-success-soft text-success",
  waitlist: "bg-accent-soft text-accent",
  inactive: "bg-bg text-muted",
  withdrawn: "bg-danger/10 text-danger",
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { deleted?: string; error?: string };
}) {
  const user = await getCurrentUserOrRedirect();

  // App-level tenant isolation: only this tenant's students.
  const rows: Row[] = await db
    .select({
      id: students.id,
      first_name: students.firstName,
      last_name: students.lastName,
      grade_level: students.gradeLevel,
      lifecycle_status: students.lifecycleStatus,
      primary_parent_name: students.primaryParentName,
      primary_email: students.primaryEmail,
      primary_phone: students.primaryPhone,
      locations: { id: locations.id, name: locations.name },
    })
    .from(students)
    .innerJoin(locations, eq(locations.id, students.locationId))
    .where(eq(students.tenantId, user.tenantId!))
    .orderBy(asc(students.lastName), asc(students.firstName));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Students</h1>
          <p className="mt-1 text-sm text-muted">
            One row per student. Parent contact lives directly on each student.
          </p>
        </div>
        <Link href="/tenant/students/new" className="btn-primary w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add student
        </Link>
      </div>

      {searchParams.deleted ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Student deleted.
        </div>
      ) : null}
      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
          <GraduationCap className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-3 text-sm text-muted">No students yet.</p>
          <p className="mt-1 text-sm text-muted">Add your first student to start enrolling.</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <ul className="divide-y divide-line">
            {rows.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/tenant/students/${s.id}/edit`}
                  className="group flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-bg/70"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink">
                        {s.last_name}, {s.first_name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          STATUS_BADGE[s.lifecycle_status] ?? "bg-line text-muted"
                        }`}
                      >
                        {s.lifecycle_status}
                      </span>
                      {s.grade_level ? (
                        <span className="text-xs text-muted">· {s.grade_level}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {s.primary_parent_name ?? "—"}
                      {s.primary_email ? ` · ${s.primary_email}` : ""}
                      {s.primary_phone ? ` · ${s.primary_phone}` : ""}
                    </p>
                    {s.locations?.name ? (
                      <p className="mt-0.5 text-[11px] text-muted">{s.locations.name}</p>
                    ) : null}
                  </div>
                  <Pencil className="h-4 w-4 shrink-0 text-muted transition group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
