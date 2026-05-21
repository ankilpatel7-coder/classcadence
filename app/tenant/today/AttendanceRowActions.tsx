"use client";

import { useFormStatus } from "react-dom";
import { Check, LogOut, CircleSlash, FilePen, RotateCcw } from "lucide-react";
import { updateAttendanceAction } from "./actions";

type Action = "check_in" | "check_out" | "mark_absent" | "mark_excused" | "reset";

const META: Record<Action, { label: string; icon: typeof Check; classes: string }> = {
  check_in: {
    label: "Check in",
    icon: Check,
    classes: "bg-success text-white hover:bg-success/90",
  },
  check_out: {
    label: "Check out",
    icon: LogOut,
    classes: "bg-primary text-white hover:bg-primary-strong",
  },
  mark_absent: {
    label: "Absent",
    icon: CircleSlash,
    classes:
      "border border-danger/30 bg-surface text-danger hover:bg-danger/5",
  },
  mark_excused: {
    label: "Excuse",
    icon: FilePen,
    classes:
      "border border-line bg-surface text-muted hover:bg-bg",
  },
  reset: {
    label: "Undo",
    icon: RotateCcw,
    classes: "border border-line bg-surface text-muted hover:bg-bg",
  },
};

function PendingButton({ action }: { action: Action }) {
  const { pending } = useFormStatus();
  const { label, icon: Icon, classes } = META[action];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${classes}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {pending ? "…" : label}
    </button>
  );
}

export function AttendanceRowActions({
  attendanceId,
  status,
  checkedIn,
  checkedOut,
}: {
  attendanceId: string;
  status: string;
  checkedIn: boolean;
  checkedOut: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {!checkedIn && status !== "absent" && status !== "excused" ? (
        <ActionForm attendanceId={attendanceId} action="check_in" />
      ) : null}
      {checkedIn && !checkedOut ? (
        <ActionForm attendanceId={attendanceId} action="check_out" />
      ) : null}
      {status === "expected" || status === "late" ? (
        <ActionForm attendanceId={attendanceId} action="mark_absent" />
      ) : null}
      {status !== "excused" ? (
        <ActionForm attendanceId={attendanceId} action="mark_excused" />
      ) : null}
      {status !== "expected" ? (
        <ActionForm attendanceId={attendanceId} action="reset" />
      ) : null}
    </div>
  );
}

function ActionForm({
  attendanceId,
  action,
}: {
  attendanceId: string;
  action: Action;
}) {
  return (
    <form action={updateAttendanceAction}>
      <input type="hidden" name="attendance_id" value={attendanceId} />
      <input type="hidden" name="action" value={action} />
      <PendingButton action={action} />
    </form>
  );
}
