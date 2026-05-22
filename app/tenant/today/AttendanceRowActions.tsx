"use client";

import { useFormStatus } from "react-dom";
import { Check, LogOut, CircleSlash, FilePen, RotateCcw } from "lucide-react";
import { updateAttendanceAction } from "./actions";

type Action = "check_in" | "check_out" | "mark_absent" | "mark_excused" | "reset";

type Meta = {
  label: string;
  icon: typeof Check;
  classes: string;
  style?: React.CSSProperties;
};

const META: Record<Action, Meta> = {
  check_in: {
    label: "Check in",
    icon: Check,
    classes:
      "text-white shadow-emboss hover:brightness-110 hover:-translate-y-px active:translate-y-0",
    style: {
      backgroundImage:
        "linear-gradient(180deg, #2BC98A 0%, #16A34A 55%, #0B6845 100%)",
    },
  },
  check_out: {
    label: "Check out",
    icon: LogOut,
    classes:
      "text-white shadow-emboss hover:brightness-110 hover:-translate-y-px active:translate-y-0",
    style: {
      backgroundImage:
        "linear-gradient(180deg, #2746a1 0%, var(--color-primary) 55%, var(--color-primary-strong) 100%)",
    },
  },
  mark_absent: {
    label: "Absent",
    icon: CircleSlash,
    classes:
      "bg-danger/10 text-danger ring-1 ring-inset ring-danger/15 hover:bg-danger/15 hover:ring-danger/25 hover:-translate-y-px active:translate-y-0",
  },
  mark_excused: {
    label: "Excuse",
    icon: FilePen,
    classes:
      "bg-bg/80 text-ink/70 ring-1 ring-inset ring-line/70 hover:bg-bg hover:text-ink hover:-translate-y-px active:translate-y-0",
  },
  reset: {
    label: "Undo",
    icon: RotateCcw,
    classes:
      "bg-transparent text-muted ring-1 ring-inset ring-line/60 hover:bg-bg/70 hover:text-ink hover:-translate-y-px active:translate-y-0",
  },
};

function PendingButton({ action }: { action: Action }) {
  const { pending } = useFormStatus();
  const { label, icon: Icon, classes } = META[action];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${classes}`}
    >
      <Icon className="h-4 w-4" />
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
