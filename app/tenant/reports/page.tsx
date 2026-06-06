import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  students as studentsTable,
  classrooms as classroomsTable,
  locations as locationsTable,
} from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { resolveRange } from "@/lib/reports/range";
import {
  loadAttendanceReport,
  STATUS_LABELS,
  type ReportGroup,
  type ReportStatus,
} from "@/lib/reports/attendance-report";
import { RangePicker } from "../RangePicker";
import {
  ReportsControls,
  type Tab,
  type Dimension,
} from "./ReportsControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports — ClassCadence" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: {
    range?: string;
    from?: string;
    to?: string;
    tab?: string;
    dim?: string;
    student_id?: string;
    class_id?: string;
  };
}) {
  const user = await getCurrentUserOrRedirect();
  const tenantId = user.tenantId!;

  const range = resolveRange(searchParams);
  const tab: Tab = searchParams.tab === "daily" ? "daily" : "analysis";
  const dimension: Dimension = searchParams.dim === "class" ? "class" : "student";
  const studentId = dimension === "student" ? searchParams.student_id ?? "" : "";
  const classId = dimension === "class" ? searchParams.class_id ?? "" : "";

  const [studentOptions, classOptions, report] = await Promise.all([
    db
      .select({
        id: studentsTable.id,
        firstName: studentsTable.firstName,
        lastName: studentsTable.lastName,
      })
      .from(studentsTable)
      .where(
        and(
          eq(studentsTable.tenantId, tenantId),
          eq(studentsTable.lifecycleStatus, "active")
        )
      )
      .orderBy(asc(studentsTable.lastName), asc(studentsTable.firstName)),
    db
      .select({ id: classroomsTable.id, name: classroomsTable.name })
      .from(classroomsTable)
      .innerJoin(
        locationsTable,
        eq(locationsTable.id, classroomsTable.locationId)
      )
      .where(
        and(
          eq(locationsTable.tenantId, tenantId),
          eq(classroomsTable.status, "active")
        )
      )
      .orderBy(asc(classroomsTable.name)),
    loadAttendanceReport({
      tenantId,
      start: range.start,
      end: range.end,
      studentId: studentId || undefined,
      classroomId: classId || undefined,
    }),
  ]);

  const students = studentOptions.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`.trim(),
  }));

  const groups = dimension === "student" ? report.byStudent : report.byClass;

  // Group daily rows by date for the Daily log tab.
  const dailyByDate: { dateKey: string; displayDate: string; rows: typeof report.daily }[] = [];
  for (const row of report.daily) {
    const last = dailyByDate[dailyByDate.length - 1];
    if (last && last.dateKey === row.dateKey) last.rows.push(row);
    else
      dailyByDate.push({
        dateKey: row.dateKey,
        displayDate: row.displayDate,
        rows: [row],
      });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reports</h1>
          <p className="mt-1 text-sm text-muted">
            Attendance analysis and daily logs · {range.label}
          </p>
        </div>
        <RangePicker
          current={range.key}
          from={range.from}
          to={range.to}
          basePath="/tenant/reports"
        />
      </div>

      <ReportsControls
        tab={tab}
        dimension={dimension}
        studentId={studentId}
        classId={classId}
        students={students}
        classes={classOptions}
      />

      {/* Summary tiles — always reflect the current filter + range. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <SummaryTile label="Expected" value={report.totals.expected} />
        <SummaryTile label="Present" value={report.totals.present} tone="success" />
        <SummaryTile label="Late" value={report.totals.late} tone="warning" />
        <SummaryTile label="Left early" value={report.totals.early} tone="warning" />
        <SummaryTile label="Absent" value={report.totals.absent} tone="danger" />
        <SummaryTile label="Excused" value={report.totals.excused} tone="muted" />
        <SummaryTile label="Make-ups" value={report.totals.madeUp} tone="primary" />
        <SummaryTile label="Rate" value={`${report.totals.rate}%`} tone="primary" />
      </div>

      {tab === "analysis" ? (
        <AnalysisTable
          groups={groups}
          dimensionLabel={dimension === "student" ? "Student" : "Class"}
        />
      ) : (
        <DailyLog groups={dailyByDate} />
      )}
    </div>
  );
}

function AnalysisTable({
  groups,
  dimensionLabel,
}: {
  groups: ReportGroup[];
  dimensionLabel: string;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center text-sm text-muted">
        No attendance records in this window.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead>
          <tr className="border-b border-line bg-bg/50 text-left">
            <Th>{dimensionLabel}</Th>
            <Th className="text-right">Expected</Th>
            <Th className="text-right">Present</Th>
            <Th className="text-right">Late</Th>
            <Th className="text-right">Early</Th>
            <Th className="text-right">Absent</Th>
            <Th className="text-right">Excused</Th>
            <Th className="text-right">Make-ups</Th>
            <Th className="text-right">Rate</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {groups.map((g) => (
            <tr key={g.id} className="transition hover:bg-primary-soft/20">
              <td className="px-4 py-3 font-medium text-ink">{g.name}</td>
              <Td>{g.expected}</Td>
              <Td className="text-success">{g.present}</Td>
              <Td>{g.late}</Td>
              <Td>{g.early}</Td>
              <Td className="text-danger">{g.absent}</Td>
              <Td>{g.excused}</Td>
              <Td className="text-primary">{g.madeUp}</Td>
              <td className="px-4 py-3 text-right">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full bg-success"
                      style={{ width: `${g.rate}%` }}
                    />
                  </span>
                  <span className="tabular-nums text-ink">{g.rate}%</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DailyLog({
  groups,
}: {
  groups: { dateKey: string; displayDate: string; rows: { studentName: string; classroomName: string; status: ReportStatus }[] }[];
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center text-sm text-muted">
        No attendance records in this window.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section
          key={g.dateKey}
          className="overflow-hidden rounded-xl border border-line bg-surface shadow-card"
        >
          <div className="border-b border-line bg-bg/50 px-4 py-2.5 text-sm font-semibold text-ink">
            {g.displayDate}
            <span className="ml-2 text-xs font-normal text-muted">
              {g.rows.length} record{g.rows.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="divide-y divide-line/60">
            {g.rows.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-ink">{r.studentName}</span>
                <span className="flex items-center gap-2">
                  <span className="hidden text-xs text-muted sm:inline">
                    {r.classroomName}
                  </span>
                  <StatusPill status={r.status} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const PILL_TONES: Record<ReportStatus, string> = {
  present: "bg-success-soft text-success",
  late: "bg-warning/15 text-warning",
  left_early: "bg-warning/15 text-warning",
  absent: "bg-danger/10 text-danger",
  excused: "bg-bg text-muted ring-1 ring-inset ring-line",
  made_up: "bg-primary-soft text-primary-strong",
  expected: "bg-bg text-muted ring-1 ring-inset ring-line",
};

function StatusPill({ status }: { status: ReportStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILL_TONES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function SummaryTile({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number | string;
  tone?: "muted" | "success" | "danger" | "warning" | "primary";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : tone === "warning"
          ? "text-warning"
          : tone === "primary"
            ? "text-primary"
            : "text-ink";
  return (
    <div className="panel px-3 py-3 text-center">
      <p className={`text-xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
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
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted ${className}`}
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
  return (
    <td className={`px-4 py-3 text-right tabular-nums text-ink/80 ${className}`}>
      {children}
    </td>
  );
}
