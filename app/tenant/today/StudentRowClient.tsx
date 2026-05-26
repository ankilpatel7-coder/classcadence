"use client";

import { useState } from "react";
import {
  Check,
  LogOut,
  CircleSlash,
  FilePen,
  RotateCcw,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { StudentAvatar } from "@/app/_components/StudentAvatar";
import { StatusBadge } from "@/app/_components/StatusIcon";
import { LiveTimer } from "@/app/_components/LiveTimer";

type Action =
  | "check_in"
  | "check_out"
  | "mark_absent"
  | "mark_excused"
  | "reset";

type RowState = {
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
};

function reduce(state: RowState, action: Action): RowState {
  const now = new Date().toISOString();
  switch (action) {
    case "check_in":
      return { ...state, status: "present", checkInAt: now };
    case "check_out":
      return { ...state, checkOutAt: now };
    case "mark_absent":
      return { ...state, status: "absent" };
    case "mark_excused":
      return { ...state, status: "excused" };
    case "reset":
      return { status: "expected", checkInAt: null, checkOutAt: null };
  }
}

type ButtonMeta = {
  label: string;
  icon: typeof Check;
  classes: string;
  style?: React.CSSProperties;
};

const META: Record<Action, ButtonMeta> = {
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

function useRowState(initial: RowState, attendanceId: string) {
  // Plain client state: lives until the page navigates away, so we never
  // need to call router.refresh(). The server action runs in the
  // background; if it fails we roll back. revalidatePath in the action
  // keeps the next fresh navigation honest.
  const [state, setState] = useState<RowState>(initial);

  function dispatch(action: Action) {
    const prev = state;
    setState((s) => reduce(s, action));
    fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendance_id: attendanceId, action }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("[attendance] update failed:", res.status, text);
          setState(prev);
        }
      })
      .catch((err) => {
        console.error("[attendance] update threw:", err);
        setState(prev);
      });
  }

  return { state, dispatch };
}

function ActionButton({
  action,
  onClick,
}: {
  action: Action;
  onClick: () => void;
}) {
  const { label, icon: Icon, classes, style } = META[action];
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${classes}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ActionButtons({
  state,
  dispatch,
}: {
  state: RowState;
  dispatch: (a: Action) => void;
}) {
  const checkedIn = !!state.checkInAt;
  const checkedOut = !!state.checkOutAt;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {!checkedIn && state.status !== "absent" && state.status !== "excused" ? (
        <ActionButton action="check_in" onClick={() => dispatch("check_in")} />
      ) : null}
      {checkedIn && !checkedOut ? (
        <ActionButton action="check_out" onClick={() => dispatch("check_out")} />
      ) : null}
      {state.status === "expected" || state.status === "late" ? (
        <ActionButton action="mark_absent" onClick={() => dispatch("mark_absent")} />
      ) : null}
      {state.status !== "excused" ? (
        <ActionButton action="mark_excused" onClick={() => dispatch("mark_excused")} />
      ) : null}
      {state.status !== "expected" ? (
        <ActionButton action="reset" onClick={() => dispatch("reset")} />
      ) : null}
    </div>
  );
}

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type StudentRowProps = {
  attendanceId: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  startLocal: string;
  endLocal: string;
  classroomName: string;
  classroomColor: string;
  firstName: string;
  lastName: string;
  isMakeup: boolean;
  isManual: boolean;
  notes: { body: string; visibility: string; createdAt: string }[];
};

export function StudentTableRow(props: StudentRowProps) {
  const { state, dispatch } = useRowState(
    {
      status: props.status,
      checkInAt: props.checkInAt,
      checkOutAt: props.checkOutAt,
    },
    props.attendanceId
  );

  return (
    <tr className="transition hover:bg-primary-soft/20">
      <td className="px-4 py-3.5 text-sm font-semibold text-ink tabular-nums">
        {props.startLocal}
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center gap-2 text-sm text-ink/70">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: props.classroomColor }}
          />
          {props.classroomName}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <StudentAvatar name={`${props.firstName} ${props.lastName}`} size={36} />
          <div>
            <p className="flex flex-wrap items-center gap-1.5 text-base font-semibold text-ink">
              {props.firstName} {props.lastName}
              {props.isMakeup ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary-strong">
                  <Sparkles className="h-3 w-3" />
                  Make-up
                </span>
              ) : null}
              {props.isManual ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                  <Sparkles className="h-3 w-3" />
                  Manual
                </span>
              ) : null}
            </p>
            {state.checkInAt ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>In {formatClockTime(state.checkInAt)}</span>
                <LiveTimer since={state.checkInAt} until={state.checkOutAt} />
                {state.checkOutAt ? (
                  <span>Out {formatClockTime(state.checkOutAt)}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={state.status} />
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
          <ActionButtons state={state} dispatch={dispatch} />
          {props.notes.length > 0 ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[10px] text-muted"
              title={props.notes.map((n) => n.body).join("\n")}
            >
              <StickyNote className="h-3 w-3" />
              {props.notes.length}
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function StudentCard(props: StudentRowProps) {
  const { state, dispatch } = useRowState(
    {
      status: props.status,
      checkInAt: props.checkInAt,
      checkOutAt: props.checkOutAt,
    },
    props.attendanceId
  );

  return (
    <li
      className="space-y-2 p-3"
      style={{ borderLeft: `4px solid ${props.classroomColor}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StudentAvatar name={`${props.firstName} ${props.lastName}`} size={26} />
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
              {props.firstName} {props.lastName}
              {props.isMakeup ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-strong">
                  <Sparkles className="h-2.5 w-2.5" />
                  Make-up
                </span>
              ) : null}
            </p>
            <p className="text-[10px] text-muted">
              {props.startLocal}–{props.endLocal} · {props.classroomName}
            </p>
            {state.checkInAt ? (
              <div className="mt-1">
                <LiveTimer since={state.checkInAt} until={state.checkOutAt} />
              </div>
            ) : null}
          </div>
        </div>
        <StatusBadge status={state.status} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <ActionButtons state={state} dispatch={dispatch} />
      </div>
    </li>
  );
}
