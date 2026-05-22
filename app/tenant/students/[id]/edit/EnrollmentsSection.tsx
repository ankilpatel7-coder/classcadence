"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check, X } from "lucide-react";
import {
  enrollStudentAction,
  endEnrollmentAction,
  type EnrollState,
} from "../../actions";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type SlotCard = {
  id: string;
  weekday: Weekday;
  start_time: string; // "HH:MM"
  end_time: string;
  classroom_name: string;
  classroom_color: string;
  location_name: string;
  capacity: number;
  enrolled_count: number;
  // When the current student is in this slot, this is their enrollment id.
  current_student_enrollment_id: string | null;
};

const WEEKDAYS: { key: Weekday; full: string }[] = [
  { key: "mon", full: "Monday" },
  { key: "tue", full: "Tuesday" },
  { key: "wed", full: "Wednesday" },
  { key: "thu", full: "Thursday" },
  { key: "fri", full: "Friday" },
  { key: "sat", full: "Saturday" },
  { key: "sun", full: "Sunday" },
];

const initialState: EnrollState = { error: null, success: false };

function EnrollButton({ disabled, slot }: { disabled: boolean; slot: SlotCard }) {
  const { pending } = useFormStatus();
  const pct = slot.enrolled_count / slot.capacity;
  const tone =
    slot.enrolled_count >= slot.capacity
      ? "border-line bg-line/30 text-muted cursor-not-allowed"
      : pct >= 0.8
        ? "border-warning/30 bg-warning/5 hover:bg-warning/10"
        : "border-line bg-surface hover:bg-primary-soft/40 hover:border-primary/30";

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`relative w-full rounded-md border px-3 py-2 text-left transition ${tone} disabled:opacity-100`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-xs tabular-nums text-ink">
          {slot.start_time}
        </span>
        <span
          className={`text-[10px] font-medium tabular-nums ${
            slot.enrolled_count >= slot.capacity ? "text-danger" : "text-muted"
          }`}
        >
          {slot.enrolled_count}/{slot.capacity}
          {slot.enrolled_count >= slot.capacity ? " · full" : ""}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted">
        <span
          aria-hidden
          className="mr-1 inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: slot.classroom_color }}
        />
        {slot.classroom_name}
      </p>
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-surface/60 text-[10px] font-medium text-primary">
          Enrolling…
        </span>
      ) : null}
    </button>
  );
}

function EnrolledChip({ slot }: { slot: SlotCard }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !window.confirm(
            `Remove this student from ${slot.classroom_name} on ` +
              `${WEEKDAYS.find((d) => d.key === slot.weekday)?.full} ` +
              `${slot.start_time}–${slot.end_time}?`
          )
        )
          e.preventDefault();
      }}
      className="relative w-full overflow-hidden rounded-md border px-3 py-2 text-left transition disabled:opacity-60"
      style={{
        borderColor: slot.classroom_color,
        backgroundColor: `${slot.classroom_color}1A`,
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-ink">
          <Check className="h-3 w-3" />
          {slot.start_time}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink/70 transition group-hover:text-danger">
          <X className="h-3 w-3" />
          remove
        </span>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-ink/70">
        <span
          aria-hidden
          className="mr-1 inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: slot.classroom_color }}
        />
        {slot.classroom_name} · enrolled
      </p>
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center bg-surface/70 text-[10px] font-medium text-primary">
          Removing…
        </span>
      ) : null}
    </button>
  );
}

export function EnrollmentsSection({
  studentId,
  slots,
}: {
  studentId: string;
  slots: SlotCard[];
}) {
  const [enrollState, enrollAction] = useFormState(
    enrollStudentAction,
    initialState
  );

  if (slots.length === 0) {
    return (
      <p className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
        No active time slots in your tenant yet. Add slots to a classroom first.
      </p>
    );
  }

  // Group locations -> weekdays
  const byLocation = new Map<string, SlotCard[]>();
  for (const s of slots) {
    const key = s.location_name;
    if (!byLocation.has(key)) byLocation.set(key, []);
    byLocation.get(key)!.push(s);
  }

  return (
    <div className="space-y-6">
      {Array.from(byLocation.entries()).map(([locName, locSlots]) => {
        const byDay = groupByWeekday(locSlots);
        return (
          <div key={locName} className="space-y-3">
            {byLocation.size > 1 ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
                {locName}
              </p>
            ) : null}

            <div className="space-y-2">
              {WEEKDAYS.filter((d) => byDay.get(d.key)?.length).map((d) => (
                <div
                  key={d.key}
                  className="rounded-md border border-line bg-bg/40 p-3"
                >
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                    {d.full}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {(byDay.get(d.key) ?? [])
                      .slice()
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((slot) => {
                        if (slot.current_student_enrollment_id) {
                          return (
                            <form
                              key={slot.id}
                              action={endEnrollmentAction}
                              className="group"
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={slot.current_student_enrollment_id}
                              />
                              <input
                                type="hidden"
                                name="student_id"
                                value={studentId}
                              />
                              <EnrolledChip slot={slot} />
                            </form>
                          );
                        }
                        const full = slot.enrolled_count >= slot.capacity;
                        return (
                          <form key={slot.id} action={enrollAction}>
                            <input type="hidden" name="student_id" value={studentId} />
                            <input
                              type="hidden"
                              name="time_slot_id"
                              value={slot.id}
                            />
                            <EnrollButton disabled={full} slot={slot} />
                          </form>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {enrollState.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {enrollState.error}
        </p>
      ) : null}
    </div>
  );
}

function groupByWeekday(slots: SlotCard[]): Map<Weekday, SlotCard[]> {
  const out = new Map<Weekday, SlotCard[]>();
  for (const s of slots) {
    if (!out.has(s.weekday)) out.set(s.weekday, []);
    out.get(s.weekday)!.push(s);
  }
  return out;
}
