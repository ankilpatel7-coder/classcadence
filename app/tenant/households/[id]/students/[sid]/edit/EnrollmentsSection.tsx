"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { CalendarPlus, X } from "lucide-react";
import {
  enrollStudentAction,
  endEnrollmentAction,
  type EnrollState,
} from "../../../../actions";

export type SlotOption = {
  id: string;
  label: string; // e.g. "Mon 16:00–17:00 · Room A · Main"
};

export type EnrollmentRow = {
  id: string;
  effective_from: string;
  effective_to: string | null;
  slot_label: string;
};

const initialState: EnrollState = { error: null, success: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition hover:bg-primary-strong disabled:opacity-60"
    >
      {pending ? "Enrolling…" : "Enroll"}
    </button>
  );
}

function EndButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !window.confirm(
            "End this enrollment today? Past sessions stay intact; the student " +
              "stops being expected on future sessions of this slot."
          )
        )
          e.preventDefault();
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-bg disabled:opacity-60"
    >
      <X className="h-3.5 w-3.5" />
      {pending ? "Ending…" : "End"}
    </button>
  );
}

export function EnrollmentsSection({
  studentId,
  householdId,
  enrollments,
  slotOptions,
}: {
  studentId: string;
  householdId: string;
  enrollments: EnrollmentRow[];
  slotOptions: SlotOption[];
}) {
  const [state, formAction] = useFormState(enrollStudentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="space-y-4">
      {enrollments.length === 0 ? (
        <p className="rounded-md border border-dashed border-line bg-bg/40 px-4 py-6 text-center text-sm text-muted">
          No enrollments yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {enrollments.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-2"
            >
              <div>
                <p className="text-sm font-medium text-ink">{e.slot_label}</p>
                <p className="text-xs text-muted">
                  From {e.effective_from}
                  {e.effective_to ? ` · ends ${e.effective_to}` : " · ongoing"}
                </p>
              </div>
              {e.effective_to ? null : (
                <form action={endEnrollmentAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="student_id" value={studentId} />
                  <input type="hidden" name="household_id" value={householdId} />
                  <EndButton />
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {slotOptions.length === 0 ? (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
          No active time slots exist yet. Add slots inside a classroom first.
        </p>
      ) : (
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="student_id" value={studentId} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <div>
              <label
                htmlFor="time_slot_id"
                className="block text-xs font-medium text-muted"
              >
                Time slot
              </label>
              <select
                id="time_slot_id"
                name="time_slot_id"
                required
                className="form-input mt-1"
              >
                {slotOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="effective_from"
                className="block text-xs font-medium text-muted"
              >
                Starts
              </label>
              <input
                id="effective_from"
                name="effective_from"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="form-input mt-1"
              />
            </div>
            <Submit />
          </div>

          {state.error ? (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="inline-flex items-center gap-1 rounded-md bg-success-soft px-3 py-2 text-xs text-success">
              <CalendarPlus className="h-3.5 w-3.5" />
              Enrolled.
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
