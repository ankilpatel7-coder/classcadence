"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, CircleSlash, FilePen, RotateCcw } from "lucide-react";
import { updateAttendanceAction } from "./actions";

type Action = "check_in" | "check_out" | "mark_absent" | "mark_excused" | "reset";

type RowState = {
  status: string;
  checkedIn: boolean;
  checkedOut: boolean;
};

function reduce(state: RowState, action: Action): RowState {
  switch (action) {
    case "check_in":
      return { ...state, status: "present", checkedIn: true };
    case "check_out":
      return { ...state, checkedOut: true };
    case "mark_absent":
      return { ...state, status: "absent" };
    case "mark_excused":
      return { ...state, status: "excused" };
    case "reset":
      return { status: "expected", checkedIn: false, checkedOut: false };
  }
}

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, applyOptimistic] = useOptimistic<RowState, Action>(
    { status, checkedIn, checkedOut },
    reduce
  );

  function dispatch(action: Action) {
    startTransition(async () => {
      applyOptimistic(action);
      const fd = new FormData();
      fd.set("attendance_id", attendanceId);
      fd.set("action", action);
      const result = await updateAttendanceAction(fd);
      if (!result?.ok) {
        console.error("[attendance] update failed:", result?.error);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {!state.checkedIn && state.status !== "absent" && state.status !== "excused" ? (
        <ActionButton action="check_in" onClick={() => dispatch("check_in")} pending={isPending} />
      ) : null}
      {state.checkedIn && !state.checkedOut ? (
        <ActionButton action="check_out" onClick={() => dispatch("check_out")} pending={isPending} />
      ) : null}
      {state.status === "expected" || state.status === "late" ? (
        <ActionButton action="mark_absent" onClick={() => dispatch("mark_absent")} pending={isPending} />
      ) : null}
      {state.status !== "excused" ? (
        <ActionButton action="mark_excused" onClick={() => dispatch("mark_excused")} pending={isPending} />
      ) : null}
      {state.status !== "expected" ? (
        <ActionButton action="reset" onClick={() => dispatch("reset")} pending={isPending} />
      ) : null}
    </div>
  );
}

function ActionButton({
  action,
  onClick,
  pending,
}: {
  action: Action;
  onClick: () => void;
  pending: boolean;
}) {
  const { label, icon: Icon, classes, style } = META[action];
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${classes} ${pending ? "opacity-80" : ""}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
