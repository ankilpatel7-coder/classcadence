import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck2,
  GraduationCap,
  MapPin,
  Plus,
  Sparkles,
  UserMinus,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { AttendanceRing } from "@/app/_components/dashboard/AttendanceRing";
import {
  WeeklyBars,
  type WeekBar,
} from "@/app/_components/dashboard/WeeklyBars";
import { SendRemindersButton } from "@/app/_components/dashboard/SendRemindersButton";
import { StudentAvatar } from "@/app/_components/StudentAvatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — ClassCadence" };

type AttRow = {
  status: string;
  sessions: { scheduled_start_utc: string } | null;
};

type AbsenceRow = {
  id: string;
  student_id: string;
  sessions: {
    scheduled_start_utc: string;
    time_slots: {
      classrooms: {
        name: string;
        locations: { iana_timezone: string };
      };
    };
  };
  students: { first_name: string; last_name: string } | null;
};

export default async function TenantHomePage({
  searchParams,
}: {
  searchParams: { reminders_sent?: string; reminders_skipped?: string; error?: string };
}) {
  const user = await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  const now = new Date();
  const nowIso = now.toISOString();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // RLS scopes everything to this tenant via the user-context client.
  // Fire all dashboard queries in parallel.
  const [
    locationsRes,
    activeStudentsRes,
    attendanceLast4WeeksRes,
    sessionsTodayRes,
    pendingMakeupsRes,
    recentAbsencesRes,
  ] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name, status, city, region")
      .order("created_at", { ascending: true }),

    // Students with at least one active enrollment.
    supabase
      .from("enrollments")
      .select("student_id, effective_to")
      .or(`effective_to.is.null,effective_to.gt.${nowIso.slice(0, 10)}`),

    // 4 weeks of attendance — gives both the ring (last 7d) and the bars.
    supabase
      .from("attendance_records")
      .select("status, sessions!inner(scheduled_start_utc)")
      .gte("sessions.scheduled_start_utc", fourWeeksAgo.toISOString())
      .lte("sessions.scheduled_start_utc", nowIso),

    supabase
      .from("sessions")
      .select("id")
      .gte("scheduled_start_utc", nowIso)
      .lte("scheduled_start_utc", oneDayAhead.toISOString())
      .neq("status", "cancelled"),

    supabase
      .from("makeup_offers")
      .select("id")
      .eq("state", "pending")
      .gt("expires_at", nowIso),

    supabase
      .from("attendance_records")
      .select(
        "id, student_id, sessions!inner(scheduled_start_utc, time_slots!inner(classrooms!inner(name, locations!inner(iana_timezone)))), students(first_name, last_name)"
      )
      .eq("status", "absent")
      .gte("sessions.scheduled_start_utc", sevenDaysAgo.toISOString())
      .order("sessions(scheduled_start_utc)", { ascending: false })
      .limit(8),
  ]);

  const locations = locationsRes.data ?? [];

  // Empty state — no locations yet. Keep the original onboarding card.
  if (locations.length === 0) {
    return (
      <div className="space-y-6">
        <Header user={user} />
        <FirstLocationCard />
      </div>
    );
  }

  // Active student count
  const activeStudentIds = new Set(
    (activeStudentsRes.data ?? []).map(
      (e) => e.student_id as string
    )
  );
  const activeStudentsCount = activeStudentIds.size;

  // Attendance counts split by 4 buckets.
  const attRows = (attendanceLast4WeeksRes.data ?? []) as unknown as AttRow[];
  const last7d = attRows.filter(
    (a) =>
      a.sessions &&
      new Date(a.sessions.scheduled_start_utc) >= sevenDaysAgo &&
      new Date(a.sessions.scheduled_start_utc) <= now
  );
  const last7dPresent = last7d.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  const last7dAbsent = last7d.filter((a) => a.status === "absent").length;
  const last7dDecided = last7dPresent + last7dAbsent;
  const attendanceRatio =
    last7dDecided > 0
      ? Math.round((last7dPresent / last7dDecided) * 100)
      : 0;

  // Bucket attendance into the last 4 calendar weeks.
  const weekBars = buildWeekBars(attRows, now, 4);

  const sessionsToday = sessionsTodayRes.data?.length ?? 0;
  const pendingMakeups = pendingMakeupsRes.data?.length ?? 0;

  const absences = (recentAbsencesRes.data ?? []) as unknown as AbsenceRow[];

  return (
    <div className="space-y-5">
      <Header user={user} />

      {/* Flash banners for the reminders button */}
      {searchParams.reminders_sent ? (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-2.5 text-sm text-success">
          <Sparkles className="h-4 w-4" />
          Sent <strong>{searchParams.reminders_sent}</strong>{" "}
          reminder email{searchParams.reminders_sent === "1" ? "" : "s"}
          {Number(searchParams.reminders_skipped ?? 0) > 0
            ? ` · skipped ${searchParams.reminders_skipped} (no email on file or opted out)`
            : ""}
          .
        </div>
      ) : null}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Active students"
          value={activeStudentsCount}
          icon={GraduationCap}
          tone="primary"
          href="/tenant/students"
        />
        <KpiTile
          label="Sessions today"
          value={sessionsToday}
          icon={CalendarCheck2}
          tone="indigo"
          href="/tenant/today"
        />
        <KpiTile
          label="Make-ups pending"
          value={pendingMakeups}
          icon={Sparkles}
          tone="accent"
          href="/tenant/makeups"
        />
        <KpiTile
          label="Absences (7d)"
          value={last7dAbsent}
          icon={UserMinus}
          tone="danger"
        />
      </div>

      {/* Middle row: attendance ring + weekly bars + recent absences */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Ring */}
        <section className="panel relative overflow-hidden p-5">
          <SectionHeader title="Attendance ratio" hint="Last 7 days" />
          <div className="mt-3 flex items-center justify-center py-2">
            <AttendanceRing percent={attendanceRatio} />
          </div>
          <div className="mt-2 flex items-center justify-around text-center text-[11px]">
            <div>
              <p className="font-semibold text-success">{last7dPresent}</p>
              <p className="text-muted">Present</p>
            </div>
            <div>
              <p className="font-semibold text-danger">{last7dAbsent}</p>
              <p className="text-muted">Absent</p>
            </div>
          </div>
        </section>

        {/* Weekly bars */}
        <section className="panel p-5 lg:col-span-2">
          <SectionHeader title="Weekly attendance" hint="Last 4 weeks" />
          <div className="mt-4">
            <WeeklyBars weeks={weekBars} />
          </div>
        </section>
      </div>

      {/* Bottom row: recent absences + quick actions */}
      <div className="grid gap-3 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <SectionHeader
            title="Recent absences"
            hint="Last 7 days"
            action={
              <Link
                href="/tenant/makeups"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Offer make-ups
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            }
          />
          {absences.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border-line bg-bg/30 px-4 py-8 text-center text-xs text-muted">
              No absences in the last 7 days. ✨
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line/60">
              {absences.map((a) => {
                const tz =
                  a.sessions.time_slots.classrooms.locations.iana_timezone;
                const date = new Date(
                  a.sessions.scheduled_start_utc
                ).toLocaleDateString("en-US", {
                  timeZone: tz,
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const fullName =
                  `${a.students?.first_name ?? ""} ${a.students?.last_name ?? ""}`
                    .trim() || "Student";
                return (
                  <li key={a.id}>
                    <Link
                      href={`/tenant/students/${a.student_id}/edit`}
                      className="flex items-center gap-3 py-2.5 transition hover:bg-bg/40"
                    >
                      <StudentAvatar name={fullName} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">
                          {fullName}
                        </p>
                        <p className="text-[11px] text-muted">
                          {a.sessions.time_slots.classrooms.name} · {date}
                        </p>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Quick actions */}
        <section className="panel p-5">
          <SectionHeader title="Quick actions" />
          <div className="mt-3 flex flex-col gap-2">
            <SendRemindersButton />
            <Link
              href="/tenant/students/new"
              className="btn-secondary justify-start"
            >
              <Plus className="h-4 w-4" />
              Add a student
            </Link>
            <Link
              href="/tenant/today"
              className="btn-secondary justify-start"
            >
              <CalendarCheck2 className="h-4 w-4" />
              Open Today
            </Link>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Reminders go to every expected student's parent for sessions in
            the next 18 hours. Skips anyone who's opted out.
          </p>
        </section>
      </div>

      {/* Locations strip */}
      <section className="panel p-5">
        <SectionHeader
          title="Your locations"
          action={
            <Link
              href="/tenant/locations/new"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              Add another
            </Link>
          }
        />
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {locations.map((l) => (
            <li key={l.id}>
              <Link
                href={`/tenant/locations/${l.id}/edit`}
                className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2.5 shadow-card transition hover:bg-bg/40"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-3.5 w-3.5 text-muted" />
                  <div>
                    <p className="text-sm font-medium text-ink">{l.name}</p>
                    <p className="text-[11px] text-muted">
                      {[l.city, l.region].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    l.status === "active"
                      ? "bg-success-soft text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {l.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Header({ user }: { user: { fullName?: string | null } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-ink">
          Welcome back{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-xs text-muted">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {hint ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted">
            {hint}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

const TONE_STYLES: Record<
  string,
  { bg: string; accent: string; iconClass: string }
> = {
  primary: {
    bg: "from-primary-soft/40 to-primary-soft/15",
    accent: "bg-primary",
    iconClass: "text-primary-strong",
  },
  indigo: {
    bg: "from-[#E0E7FF]/50 to-[#E0E7FF]/15",
    accent: "bg-[#6366F1]",
    iconClass: "text-[#4338CA]",
  },
  accent: {
    bg: "from-accent-soft/60 to-accent-soft/15",
    accent: "bg-accent",
    iconClass: "text-accent",
  },
  danger: {
    bg: "from-danger/10 to-danger/5",
    accent: "bg-danger",
    iconClass: "text-danger",
  },
};

function KpiTile({
  label,
  value,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: number;
  icon: typeof GraduationCap;
  tone: keyof typeof TONE_STYLES;
  href?: string;
}) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.primary;
  const body = (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-gradient-to-br ${styles.bg} p-4 shadow-card transition hover:-translate-y-px hover:shadow-lift`}
    >
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`}
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${styles.iconClass} opacity-80`} />
      </div>
      <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
  if (href) return <Link href={href}>{body}</Link>;
  return body;
}

function FirstLocationCard() {
  return (
    <section
      className="relative overflow-hidden rounded-lg border border-primary/15 p-8 text-center shadow-card"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 600px 220px at 50% 0%, rgba(219,234,254,0.85), transparent 70%), linear-gradient(180deg, #ffffff 0%, #fdfcf9 100%)",
      }}
    >
      <h2 className="text-xl font-semibold text-ink">
        Let&apos;s add your first location.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        A location is one physical learning center. It has its own timezone,
        address, and weekly operating hours. You can add more later.
      </p>
      <Link href="/tenant/locations/new" className="btn-primary mt-6">
        <Plus className="h-4 w-4" />
        Add a location
      </Link>
    </section>
  );
}

// Bucket attendance rows into the last N calendar weeks (Mon-Sun).
// Each bar shows the present/decided ratio for that week.
function buildWeekBars(
  rows: AttRow[],
  now: Date,
  weeks: number
): WeekBar[] {
  const out: WeekBar[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    let present = 0;
    let absent = 0;
    for (const r of rows) {
      if (!r.sessions) continue;
      const ts = new Date(r.sessions.scheduled_start_utc);
      if (ts < start || ts >= end) continue;
      if (r.status === "present" || r.status === "late") present++;
      else if (r.status === "absent") absent++;
    }
    const decided = present + absent;
    const ratio = decided > 0 ? Math.round((present / decided) * 100) : 0;
    const label = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    out.push({ label, ratio, present, absent });
  }
  return out;
}
