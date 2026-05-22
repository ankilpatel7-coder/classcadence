"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ChevronRight, Trash2, X } from "lucide-react";
import {
  enrollStudentAction,
  endEnrollmentAction,
  type EnrollState,
} from "../../actions";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type CurrentEnrollment = {
  enrollment_id: string;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  classroom_name: string;
  classroom_color: string;
  location_name: string;
};

export type WizardClassroom = {
  id: string;
  name: string;
  color: string;
  default_capacity: number;
  location_name: string;
  slots: {
    id: string;
    weekday: Weekday;
    start_time: string;
    end_time: string;
    capacity: number;
    enrolled_count: number;
  }[];
};

const WEEKDAYS: { key: Weekday; short: string; full: string }[] = [
  { key: "mon", short: "Mon", full: "Monday" },
  { key: "tue", short: "Tue", full: "Tuesday" },
  { key: "wed", short: "Wed", full: "Wednesday" },
  { key: "thu", short: "Thu", full: "Thursday" },
  { key: "fri", short: "Fri", full: "Friday" },
  { key: "sat", short: "Sat", full: "Saturday" },
  { key: "sun", short: "Sun", full: "Sunday" },
];

const initialState: EnrollState = { error: null, success: false };

function RemoveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(`Remove this student from ${label}?`)) e.preventDefault();
      }}
      className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-surface px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/5 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

function EnrollSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full justify-between !py-2 text-xs"
    >
      <span className="font-mono tabular-nums">{label}</span>
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );
}

export function EnrollmentsSection({
  studentId,
  currentEnrollments,
  classrooms,
  occupiedWeekdays,
}: {
  studentId: string;
  currentEnrollments: CurrentEnrollment[];
  classrooms: WizardClassroom[];
  occupiedWeekdays: string[];
}) {
  const [state, formAction] = useFormState(enrollStudentAction, initialState);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [day, setDay] = useState<Weekday | null>(null);

  // Reset wizard after a successful enroll. Re-fetched data flows in via props.
  useEffect(() => {
    if (state.success) {
      setClassroomId(null);
      setDay(null);
    }
  }, [state.success]);

  const occupied = useMemo(
    () => new Set(occupiedWeekdays),
    [occupiedWeekdays]
  );

  const cls = classrooms.find((c) => c.id === classroomId) ?? null;

  const availableDays = useMemo(() => {
    if (!cls) return [];
    const set = new Set(cls.slots.map((s) => s.weekday));
    return WEEKDAYS.filter((d) => set.has(d.key));
  }, [cls]);

  const slotsForDay = useMemo(() => {
    if (!cls || !day) return [];
    return cls.slots
      .filter((s) => s.weekday === day && s.enrolled_count < s.capacity)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [cls, day]);

  function weekdayFull(w: string) {
    return WEEKDAYS.find((d) => d.key === w)?.full ?? w;
  }

  return (
    <div className="space-y-6">
      {/* Current classes */}
      <div className="space-y-2">
        <h3 className="section-eyebrow">Current classes</h3>
        {currentEnrollments.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-bg/40 px-4 py-4 text-center text-xs text-muted">
            Not enrolled in any classes yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {currentEnrollments.map((e) => (
              <li
                key={e.enrollment_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-surface px-4 py-3"
                style={{ borderLeftColor: e.classroom_color, borderLeftWidth: 4 }}
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    <span className="text-xs uppercase tracking-wider text-muted">
                      {weekdayFull(e.weekday)}
                    </span>{" "}
                    <span className="font-mono tabular-nums">
                      {e.start_time}–{e.end_time}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {e.classroom_name} · {e.location_name}
                  </p>
                </div>
                <form action={endEnrollmentAction}>
                  <input type="hidden" name="id" value={e.enrollment_id} />
                  <input type="hidden" name="student_id" value={studentId} />
                  <RemoveButton
                    label={`${weekdayFull(e.weekday)} ${e.start_time}, ${e.classroom_name}`}
                  />
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add a class — three-step wizard */}
      <div className="space-y-4 rounded-md border border-line bg-bg/30 p-4">
        <h3 className="section-eyebrow">Add a class</h3>

        {/* Step 1: Classroom */}
        <Step n={1} label="Classroom">
          {classrooms.length === 0 ? (
            <p className="text-xs text-muted">
              No active classrooms in your tenant yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classrooms.map((c) => {
                const active = classroomId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClassroomId(c.id);
                      setDay(null);
                    }}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                      active
                        ? "border-primary bg-primary text-white shadow-emboss"
                        : "border-line bg-surface text-ink hover:border-primary/40 hover:bg-primary-soft/30"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-full border border-white/30"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.name}</span>
                    <span
                      className={`text-[10px] ${active ? "text-white/70" : "text-muted"}`}
                    >
                      · {c.location_name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Step>

        {/* Step 2: Day */}
        {classroomId ? (
          <Step n={2} label="Day">
            {availableDays.length === 0 ? (
              <p className="text-xs text-muted">
                No time slots on this classroom yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableDays.map((d) => {
                  const active = day === d.key;
                  const blocked = occupied.has(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      disabled={blocked}
                      title={
                        blocked
                          ? "Student already has a class on this day"
                          : undefined
                      }
                      onClick={() => setDay(d.key)}
                      className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition ${
                        active
                          ? "border-primary bg-primary text-white shadow-emboss"
                          : blocked
                            ? "border-line bg-line/30 text-muted cursor-not-allowed"
                            : "border-line bg-surface text-ink hover:border-primary/40 hover:bg-primary-soft/30"
                      }`}
                    >
                      {d.short}
                      {blocked ? (
                        <X className="h-3 w-3" aria-label="day already has a class" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </Step>
        ) : null}

        {/* Step 3: Available time slots */}
        {classroomId && day ? (
          <Step n={3} label="Available time">
            {slotsForDay.length === 0 ? (
              <p className="text-xs text-muted">
                No available times on this day. (All slots are full or there are
                no slots scheduled.)
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {slotsForDay.map((slot) => (
                  <form key={slot.id} action={formAction}>
                    <input type="hidden" name="student_id" value={studentId} />
                    <input type="hidden" name="time_slot_id" value={slot.id} />
                    <EnrollSubmit
                      label={`${slot.start_time} (${slot.enrolled_count}/${slot.capacity})`}
                    />
                  </form>
                ))}
              </div>
            )}
          </Step>
        ) : null}

        {state.error ? (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Step({
  n,
  label,
  children,
}: {
  n: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary-strong">
          {n}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
