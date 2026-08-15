// One rendered line on the Today page: a single student in a single session.
// Built on the server (see page.tsx) and handed to the client list, so every
// field must be serializable.
export type TodayRow = {
  attendanceId: string;
  sessionId: string;
  startUtc: string;
  endUtc: string;
  startLocal: string;
  endLocal: string;
  classroomName: string;
  classroomColor: string;
  firstName: string;
  lastName: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  isMakeup: boolean;
  isManual: boolean;
  notes: { body: string; visibility: string; createdAt: string }[];
};

// How long the session is scheduled to run, in ms. This is the per-session
// "time limit" a student's checked-in time is measured against.
export function sessionLengthMs(row: TodayRow): number {
  return new Date(row.endUtc).getTime() - new Date(row.startUtc).getTime();
}

// How early a student joins the pinned board, ahead of their due time.
export const DUE_SOON_MS = 5 * 60 * 1000;

// Milliseconds until this student reaches their session length — their
// "supposed check-out time". Goes negative once they're past it, so sorting
// ascending puts the most overdue first, then whoever is closest to due.
//
// null means not eligible: only students who are checked in and not yet
// checked out have a due time.
export function msUntilDue(
  row: TodayRow,
  state: { checkInAt: string | null; checkOutAt: string | null },
  now: number
): number | null {
  if (!state.checkInAt) return null;
  if (state.checkOutAt) return null;
  return new Date(state.checkInAt).getTime() + sessionLengthMs(row) - now;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
