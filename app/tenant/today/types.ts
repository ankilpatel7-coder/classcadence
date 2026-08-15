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

// Milliseconds a checked-in student has been in past their session length, or
// null if they aren't over (or aren't eligible: only students who are checked
// in and not yet checked out can run over).
export function overdueBy(
  row: TodayRow,
  state: { checkInAt: string | null; checkOutAt: string | null },
  now: number
): number | null {
  if (!state.checkInAt || state.checkOutAt) return null;
  const over =
    now - new Date(state.checkInAt).getTime() - sessionLengthMs(row);
  return over >= 0 ? over : null;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
