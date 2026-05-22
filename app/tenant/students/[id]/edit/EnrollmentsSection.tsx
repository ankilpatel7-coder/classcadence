"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ChevronRight, Lock, Trash2 } from "lucide-react";
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
  classroom_id: string;
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
  max_classes_per_week: number;
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
      className="btn-primary w-full justify-center !py-2 text-xs"
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
  lockedClassroomId,
}: {
  studentId: string;
  currentEnrollments: CurrentEnrollment[];
  classrooms: WizardClassroom[];
  occupiedWeekdays: string[];
  lockedClassroomId: string | null;
}) {
  const [state, formAction] = useFormState(enrollStudentAction, initialState);
  const [pickedClassroomId, setPickedClassroomId] = useState<string | null>(null);

  // The classroom the wizard is currently anchored to.
  const effectiveClassroomId = lockedClassroomId ?? pickedClassroomId;

  // Reset picker after an enroll succeeds (locked case becomes effective).
  useEffect(() => {
    if (state.success) setPickedClassroomId(null);
  }, [state.success]);

  const occupied = useMemo(() => new Set(occupiedWeekdays), [occupiedWeekdays]);

  const cls = useMemo(
    () =>
      classrooms.find((c) => c.id === effectiveClassroomId) ?? null,
    [classrooms, effectiveClassroomId]
  );

  // Cap is per-location and rides with the chosen/locked classroom.
  const weeklyCap = cls?.max_classes_per_week ?? 0;
  const enrolledCount = currentEnrollments.length;
  const remainingClasses = Math.max(weeklyCap - enrolledCount, 0);
  const atCap = weeklyCap > 0 && enrolledCount >= weeklyCap;

  // Group available slots by weekday — full slots and occupied days are
  // filtered out so only addable times are visible.
  type SlotRow = WizardClassroom["slots"][number];
  const slotsByDay = useMemo(() => {
    const map = new Map<Weekday, SlotRow[]>();
    if (!cls) return map;
    for (const slot of cls.slots) {
      if (slot.enrolled_count >= slot.capacity) continue;
      if (occupied.has(slot.weekday)) continue;
      if (!map.has(slot.weekday)) map.set(slot.weekday, []);
      map.get(slot.weekday)!.push(slot);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [cls, occupied]);

  const hasAvailableTimes = Array.from(slotsByDay.values()).some(
    (list) => list.length > 0
  );

  function weekdayFull(w: string) {
    return WEEKDAYS.find((d) => d.key === w)?.full ?? w;
  }

  const lockedClassroomObj = lockedClassroomId
    ? classrooms.find((c) => c.id === lockedClassroomId) ?? null
    : null;

  return (
    <div className="space-y-6">
      {/* Current classes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="section-eyebrow">Current classes</h3>
          {weeklyCap > 0 ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                atCap
                  ? "bg-warning/10 text-warning"
                  : "bg-primary-soft text-primary-strong"
              }`}
            >
              {enrolledCount} / {weeklyCap} used
            </span>
          ) : null}
        </div>
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

      {/* Add a class — only render if the student has headroom */}
      {atCap ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
          <p className="font-medium">
            All {weeklyCap} weekly classes used.
          </p>
          <p className="mt-1 text-xs text-muted">
            Remove an existing class above to enroll this student in a different
            slot.
          </p>
        </div>
      ) : (
      <div className="space-y-4 rounded-md border border-line bg-bg/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="section-eyebrow">Add a class</h3>
          {weeklyCap > 0 ? (
            <span className="text-[10px] text-muted">
              {remainingClasses} of {weeklyCap} remaining
            </span>
          ) : null}
        </div>

        {lockedClassroomObj ? (
          <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2">
            <Lock className="h-3.5 w-3.5 text-muted" />
            <span className="flex items-center gap-2 text-xs">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: lockedClassroomObj.color }}
              />
              <span className="font-medium text-ink">
                {lockedClassroomObj.name}
              </span>
              <span className="text-muted">· {lockedClassroomObj.location_name}</span>
            </span>
            <span className="ml-auto text-[10px] text-muted">
              Locked to this classroom
            </span>
          </div>
        ) : classrooms.length === 0 ? (
          <p className="text-xs text-muted">
            No active classrooms in your tenant yet.
          </p>
        ) : (
          <Step n={1} label="Classroom">
            <div className="flex flex-wrap gap-2">
              {classrooms.map((c) => {
                const active = pickedClassroomId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPickedClassroomId(c.id)}
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
          </Step>
        )}

        {effectiveClassroomId ? (
          <Step n={lockedClassroomObj ? 1 : 2} label="Available time">
            {!hasAvailableTimes ? (
              <p className="text-xs text-muted">
                No available times. (Days the student is already booked are
                hidden, and full slots aren&apos;t shown.)
              </p>
            ) : (
              <div className="space-y-3">
                {WEEKDAYS.filter((d) => (slotsByDay.get(d.key)?.length ?? 0) > 0).map(
                  (d) => (
                    <div key={d.key}>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
                        {d.full}
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                        {(slotsByDay.get(d.key) ?? []).map((slot: SlotRow) => (
                          <form key={slot.id} action={formAction}>
                            <input type="hidden" name="student_id" value={studentId} />
                            <input
                              type="hidden"
                              name="time_slot_id"
                              value={slot.id}
                            />
                            <EnrollSubmit
                              label={`${slot.start_time} (${slot.enrolled_count}/${slot.capacity})`}
                            />
                          </form>
                        ))}
                      </div>
                    </div>
                  )
                )}
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
      )}
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
