import Link from "next/link";
import { ChevronLeft, ChevronRight, GraduationCap, Pencil, Plus, SearchX } from "lucide-react";
import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { students, locations } from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { StudentSearch } from "./StudentSearch";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

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
  searchParams: { deleted?: string; error?: string; q?: string; page?: string };
}) {
  const user = await getCurrentUserOrRedirect();

  const query = (searchParams.q ?? "").trim();
  const requestedPage = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  // App-level tenant isolation: only this tenant's students. The search matches
  // the name (either part, and the two joined so "jane doe" works) plus the
  // parent contact fields, since that's how the front desk usually looks a
  // student up.
  const pattern = `%${query}%`;
  const where = and(
    eq(students.tenantId, user.tenantId!),
    query
      ? or(
          ilike(students.firstName, pattern),
          ilike(students.lastName, pattern),
          ilike(sql`${students.firstName} || ' ' || ${students.lastName}`, pattern),
          ilike(sql`${students.lastName} || ' ' || ${students.firstName}`, pattern),
          ilike(students.primaryParentName, pattern),
          sql`${students.primaryEmail}::text ILIKE ${pattern}`,
          ilike(students.primaryPhone, pattern)
        )
      : undefined
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(students)
    .innerJoin(locations, eq(locations.id, students.locationId))
    .where(where);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamp so a stale ?page= past the end still renders the last page of results
  // instead of an empty list.
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * PAGE_SIZE;

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
    .where(where)
    .orderBy(asc(students.lastName), asc(students.firstName))
    .limit(PAGE_SIZE)
    .offset(offset);

  function pageHref(n: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/tenant/students?${qs}` : "/tenant/students";
  }

  const firstShown = total === 0 ? 0 : offset + 1;
  const lastShown = offset + rows.length;

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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:max-w-sm sm:flex-1">
          <StudentSearch initialQuery={query} />
        </div>
        <p className="text-xs text-muted tabular-nums">
          {total === 0
            ? "No students"
            : `Showing ${firstShown}–${lastShown} of ${total}${
                query ? " matching" : ""
              }`}
        </p>
      </div>

      {total === 0 && query ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
          <SearchX className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-3 text-sm text-muted">
            No students match &ldquo;{query}&rdquo;.
          </p>
          <Link
            href="/tenant/students"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Clear search
          </Link>
        </div>
      ) : total === 0 ? (
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

      {pageCount > 1 ? (
        <nav
          aria-label="Students pagination"
          className="flex items-center justify-between gap-3"
        >
          <PageLink
            href={pageHref(currentPage - 1)}
            disabled={currentPage <= 1}
            rel="prev"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </PageLink>
          <p className="text-xs text-muted tabular-nums">
            Page {currentPage} of {pageCount}
          </p>
          <PageLink
            href={pageHref(currentPage + 1)}
            disabled={currentPage >= pageCount}
            rel="next"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </PageLink>
        </nav>
      ) : null}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  rel,
  children,
}: {
  href: string;
  disabled: boolean;
  rel: "prev" | "next";
  children: React.ReactNode;
}) {
  const classes =
    "inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium transition";
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${classes} cursor-default text-muted opacity-50`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link href={href} rel={rel} className={`${classes} text-ink hover:bg-bg/70`}>
      {children}
    </Link>
  );
}
