import Link from "next/link";
import { Sparkles, UserPlus, X } from "lucide-react";
import { and, eq, gte, inArray, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendanceRecords,
  sessions,
  timeSlots,
  classrooms,
  locations,
  students,
  makeupOffers,
} from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { formatTimeInTimezone } from "@/lib/time";
import { StudentAvatar } from "@/app/_components/StudentAvatar";
import { OfferMakeupButton } from "@/app/tenant/today/OfferMakeupButton";

export const metadata = { title: "Make-ups — ClassCadence" };
export const dynamic = "force-dynamic";

type AbsenceRow = {
  attendanceId: string;
  status: string;
  sessionStartUtc: string;
  sessionEndUtc: string;
  tz: string;
  classroomName: string;
  classroomColor: string;
  locationName: string;
  studentName: string;
  studentId: string;
  offer:
    | {
        state: "pending" | "accepted" | "declined" | "expired";
        expiresAt: string;
      }
    | null;
};

export default async function MakeupsPage({
  searchParams,
}: {
  searchParams: {
    makeup_url?: string;
    error?: string;
    added?: string;
    manual_added?: string;
  };
}) {
  const user = await getCurrentUserOrRedirect();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Attendance rows marked absent OR made_up in the past 30 days, joined
  // through session -> time_slot -> classroom -> location so we can both
  // enforce tenant isolation in code and surface the schedule details.
  // Join on session_id (the enrolled session) — see [[attendance-sessions-embed]].
  const attendanceRows = await db
    .select({
      attendanceId: attendanceRecords.id,
      status: attendanceRecords.status,
      studentId: attendanceRecords.studentId,
      sessionStartUtc: sessions.scheduledStartUtc,
      sessionEndUtc: sessions.scheduledEndUtc,
      classroomName: classrooms.name,
      classroomColor: classrooms.color,
      locationName: locations.name,
      tz: locations.ianaTimezone,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
    })
    .from(attendanceRecords)
    .innerJoin(sessions, eq(sessions.id, attendanceRecords.sessionId))
    .innerJoin(timeSlots, eq(timeSlots.id, sessions.timeSlotId))
    .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .innerJoin(students, eq(students.id, attendanceRecords.studentId))
    .where(
      and(
        inArray(attendanceRecords.status, ["absent", "made_up"]),
        gte(sessions.scheduledStartUtc, thirtyDaysAgo),
        eq(locations.tenantId, user.tenantId!)
      )
    )
    .orderBy(desc(sessions.scheduledStartUtc));

  if (attendanceRows.length === 0) {
    return <EmptyState />;
  }

  const attendanceIds = attendanceRows.map((a) => a.attendanceId);

  const offersArr = await db
    .select({
      absentAttendanceId: makeupOffers.absentAttendanceId,
      state: makeupOffers.state,
      expiresAt: makeupOffers.expiresAt,
    })
    .from(makeupOffers)
    .where(inArray(makeupOffers.absentAttendanceId, attendanceIds));

  const offerMap = new Map(
    offersArr.map((o) => [
      o.absentAttendanceId,
      {
        state: o.state as "pending" | "accepted" | "declined" | "expired",
        expiresAt: o.expiresAt.toISOString(),
      },
    ])
  );

  const rows: AbsenceRow[] = attendanceRows.map((a) => ({
    attendanceId: a.attendanceId,
    status: a.status,
    sessionStartUtc: a.sessionStartUtc.toISOString(),
    sessionEndUtc: a.sessionEndUtc.toISOString(),
    tz: a.tz,
    classroomName: a.classroomName,
    classroomColor: a.classroomColor ?? "#1E3A8A",
    locationName: a.locationName,
    studentName:
      `${a.studentFirstName ?? ""} ${a.studentLastName ?? ""}`.trim() ||
      "Unknown",
    studentId: a.studentId,
    offer: offerMap.get(a.attendanceId) ?? null,
  }));

  const needsOffer = rows.filter(
    (r) => r.status === "absent" && (!r.offer || r.offer.state === "expired" || r.offer.state === "declined")
  );
  const pending = rows.filter(
    (r) => r.offer?.state === "pending"
  );
  const completed = rows.filter(
    (r) => r.status === "made_up" || r.offer?.state === "accepted"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Make-ups</h1>
          <p className="mt-1 text-sm text-muted">
            Offer a make-up class to students who were absent. Past 30 days.
          </p>
        </div>
        <Link
          href="/tenant/makeups/manual"
          className="btn-primary w-full sm:w-auto"
          style={{
            backgroundImage:
              "linear-gradient(180deg, #FDBA74 0%, #F97316 60%, #C2410C 100%)",
          }}
        >
          <UserPlus className="h-4 w-4" />
          Add manual class
        </Link>
      </div>

      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {searchParams.added ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Added {searchParams.added} make-up class
          {searchParams.added === "1" ? "" : "es"}. The student is now expected
          in those sessions on Today and Schedule.
        </div>
      ) : null}

      {searchParams.manual_added ? (
        <div className="rounded-md border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-ink">
          Added {searchParams.manual_added} manual class
          {searchParams.manual_added === "1" ? "" : "es"}. The student now has
          a &quot;Manual&quot; tag on those sessions in Today and Schedule.
        </div>
      ) : null}

      {searchParams.makeup_url ? (
        <div className="rounded-md border border-primary/30 bg-primary-soft/40 px-4 py-3 text-sm text-ink">
          <p className="font-medium text-primary-strong">Make-up offer created.</p>
          <p className="mt-1 text-xs text-muted">
            Share this link with the parent — it expires in 7 days.
          </p>
          <p className="mt-2 break-all rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs">
            {decodeURIComponent(searchParams.makeup_url)}
          </p>
        </div>
      ) : null}

      <Section
        title="Needs a make-up"
        emptyLabel="No outstanding absences to offer make-ups for."
        rows={needsOffer}
        renderActions={(r) => (
          <OfferMakeupButton attendanceId={r.attendanceId} />
        )}
      />

      <Section
        title="Pending response"
        emptyLabel="No make-up offers waiting on a parent response."
        rows={pending}
        renderActions={(r) =>
          r.offer ? (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
              Sent · expires {new Date(r.offer.expiresAt).toLocaleDateString()}
            </span>
          ) : null
        }
      />

      <Section
        title="Completed"
        emptyLabel="No accepted or made-up classes yet."
        rows={completed}
        renderActions={(r) => (
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
            {r.status === "made_up" ? "Made up" : "Accepted"}
          </span>
        )}
      />
    </div>
  );
}

function Section({
  title,
  emptyLabel,
  rows,
  renderActions,
}: {
  title: string;
  emptyLabel: string;
  rows: AbsenceRow[];
  renderActions: (r: AbsenceRow) => React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <header className="border-b border-line bg-bg/40 px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          {title} · {rows.length}
        </h2>
      </header>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li
              key={r.attendanceId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              style={{
                borderLeft: `4px solid ${r.classroomColor}`,
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <StudentAvatar name={r.studentName} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {r.studentName}
                  </p>
                  <p className="text-xs text-muted">
                    {new Intl.DateTimeFormat("en-US", {
                      timeZone: r.tz,
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(r.sessionStartUtc))}
                    {" · "}
                    {formatTimeInTimezone(r.sessionStartUtc, r.tz)}–
                    {formatTimeInTimezone(r.sessionEndUtc, r.tz)}
                  </p>
                  <p className="text-[10px] text-muted">
                    {r.classroomName} · {r.locationName}
                  </p>
                </div>
              </div>
              <div className="shrink-0">{renderActions(r)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Make-ups</h1>
        <p className="mt-1 text-sm text-muted">
          Offer a make-up class to students who were absent. Past 30 days.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-muted" />
        <p className="mt-3 text-sm text-muted">No absences in the past 30 days.</p>
        <p className="mt-1 text-sm text-muted">
          Once a student is marked absent on Today, they&apos;ll show up here.
        </p>
      </div>
    </div>
  );
}
