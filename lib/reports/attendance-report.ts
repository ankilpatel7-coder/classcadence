import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendanceRecords,
  sessions,
  timeSlots,
  classrooms,
  locations,
  students,
} from "@/lib/db/schema";

// Minutes of slack before a check-in counts as "late". Derived purely from
// timestamps since the schema's `late` status is never set by the UI.
const LATE_GRACE_MS = 5 * 60 * 1000;

export type ReportStatus =
  | "present"
  | "late"
  | "left_early"
  | "absent"
  | "excused"
  | "made_up"
  | "expected";

export type ReportCounts = {
  expected: number; // total records in window (denominator)
  present: number; // present or late
  late: number;
  early: number; // left early
  absent: number;
  excused: number;
  madeUp: number;
  rate: number; // present / (present + absent), 0..100
};

export type ReportGroup = ReportCounts & {
  id: string;
  name: string;
};

export type DailyLogRow = {
  dateKey: string; // YYYY-MM-DD in location tz (for sorting/grouping)
  displayDate: string; // e.g. "Mon, Jun 2"
  startUtc: string;
  studentName: string;
  classroomName: string;
  status: ReportStatus;
};

export type AttendanceReport = {
  totals: ReportCounts;
  byStudent: ReportGroup[];
  byClass: ReportGroup[];
  daily: DailyLogRow[];
};

function emptyCounts(): ReportCounts {
  return {
    expected: 0,
    present: 0,
    late: 0,
    early: 0,
    absent: 0,
    excused: 0,
    madeUp: 0,
    rate: 0,
  };
}

function withRate(c: ReportCounts): ReportCounts {
  const decided = c.present + c.absent;
  return { ...c, rate: decided > 0 ? Math.round((c.present / decided) * 100) : 0 };
}

// Loads and aggregates attendance for a tenant over [start, end], optionally
// narrowed to one student and/or one classroom. Single query + in-memory
// rollups (clearer than SQL CASE sums, and the window is bounded).
export async function loadAttendanceReport(args: {
  tenantId: string;
  start: Date;
  end: Date;
  studentId?: string;
  classroomId?: string;
}): Promise<AttendanceReport> {
  const rows = await db
    .select({
      status: attendanceRecords.status,
      checkInAt: attendanceRecords.checkInAt,
      checkOutAt: attendanceRecords.checkOutAt,
      startUtc: sessions.scheduledStartUtc,
      endUtc: sessions.scheduledEndUtc,
      tz: locations.ianaTimezone,
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      classroomId: classrooms.id,
      classroomName: classrooms.name,
    })
    .from(attendanceRecords)
    .innerJoin(sessions, eq(sessions.id, attendanceRecords.sessionId))
    .innerJoin(timeSlots, eq(timeSlots.id, sessions.timeSlotId))
    .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .innerJoin(students, eq(students.id, attendanceRecords.studentId))
    .where(
      and(
        eq(locations.tenantId, args.tenantId),
        gte(sessions.scheduledStartUtc, args.start),
        lte(sessions.scheduledStartUtc, args.end),
        args.studentId ? eq(students.id, args.studentId) : undefined,
        args.classroomId ? eq(classrooms.id, args.classroomId) : undefined
      )
    )
    .orderBy(asc(sessions.scheduledStartUtc))
    .limit(50000);

  const totals = emptyCounts();
  const byStudent = new Map<string, ReportGroup>();
  const byClass = new Map<string, ReportGroup>();
  const daily: DailyLogRow[] = [];

  for (const r of rows) {
    const tz = r.tz ?? "UTC";
    const present = r.status === "present" || r.status === "late";
    const late =
      present &&
      r.checkInAt != null &&
      r.checkInAt.getTime() > r.startUtc.getTime() + LATE_GRACE_MS;
    const early =
      present &&
      r.checkOutAt != null &&
      r.checkOutAt.getTime() < r.endUtc.getTime();
    const absent = r.status === "absent";
    const excused = r.status === "excused";
    const madeUp = r.status === "made_up";

    const bump = (c: ReportCounts) => {
      c.expected += 1;
      if (present) c.present += 1;
      if (late) c.late += 1;
      if (early) c.early += 1;
      if (absent) c.absent += 1;
      if (excused) c.excused += 1;
      if (madeUp) c.madeUp += 1;
    };

    bump(totals);

    const sName = `${r.firstName} ${r.lastName}`.trim();
    let s = byStudent.get(r.studentId);
    if (!s) {
      s = { id: r.studentId, name: sName, ...emptyCounts() };
      byStudent.set(r.studentId, s);
    }
    bump(s);

    let c = byClass.get(r.classroomId);
    if (!c) {
      c = { id: r.classroomId, name: r.classroomName, ...emptyCounts() };
      byClass.set(r.classroomId, c);
    }
    bump(c);

    const iso = r.startUtc.toISOString();
    const dateKey = new Date(iso).toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
    const displayDate = new Date(iso).toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const status: ReportStatus = madeUp
      ? "made_up"
      : excused
        ? "excused"
        : absent
          ? "absent"
          : late
            ? "late"
            : early
              ? "left_early"
              : present
                ? "present"
                : "expected";

    daily.push({
      dateKey,
      displayDate,
      startUtc: iso,
      studentName: sName,
      classroomName: r.classroomName,
      status,
    });
  }

  // Newest day first; within a day, by student name.
  daily.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
    return a.studentName.localeCompare(b.studentName);
  });

  return {
    totals: withRate(totals),
    byStudent: [...byStudent.values()]
      .map(withRateGroup)
      .sort((a, b) => a.name.localeCompare(b.name)),
    byClass: [...byClass.values()]
      .map(withRateGroup)
      .sort((a, b) => a.name.localeCompare(b.name)),
    daily,
  };
}

function withRateGroup(g: ReportGroup): ReportGroup {
  return { ...g, ...withRate(g) };
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  present: "Present",
  late: "Late",
  left_early: "Left early",
  absent: "Absent",
  excused: "Excused",
  made_up: "Made up",
  expected: "Expected",
};
