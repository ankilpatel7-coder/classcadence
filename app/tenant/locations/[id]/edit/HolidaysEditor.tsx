"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import {
  addHolidayAction,
  deleteHolidayAction,
  type HolidayState,
} from "../../actions";

export type Holiday = {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
};

const initialState: HolidayState = { error: null, success: false };

function AddSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Adding…" : "Add closure"}
    </button>
  );
}

function DeleteSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(`Remove "${label}"?`)) event.preventDefault();
      }}
      className="btn-danger !px-3 !py-1.5"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

export function HolidaysEditor({
  locationId,
  holidays,
}: {
  locationId: string;
  holidays: Holiday[];
}) {
  const [state, formAction] = useFormState(addHolidayAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="space-y-4">
      {holidays.length === 0 ? (
        <p className="rounded-md border border-dashed border-line bg-bg/40 px-4 py-6 text-center text-sm text-muted">
          No closures scheduled.
        </p>
      ) : (
        <ul className="space-y-2">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-2"
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  {h.start_date}
                  {h.end_date !== h.start_date ? ` → ${h.end_date}` : ""}
                </p>
                {h.reason ? (
                  <p className="text-xs text-muted">{h.reason}</p>
                ) : null}
              </div>
              <form action={deleteHolidayAction}>
                <input type="hidden" name="id" value={h.id} />
                <input type="hidden" name="location_id" value={locationId} />
                <DeleteSubmit label={h.reason || h.start_date} />
              </form>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="space-y-3">
        <input type="hidden" name="location_id" value={locationId} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label
              htmlFor="start_date"
              className="block text-xs font-medium text-muted"
            >
              Start date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              required
              className="form-input mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="end_date"
              className="block text-xs font-medium text-muted"
            >
              End date
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              required
              className="form-input mt-1"
            />
          </div>
          <div>
            <label htmlFor="reason" className="block text-xs font-medium text-muted">
              Reason (optional)
            </label>
            <input
              id="reason"
              name="reason"
              type="text"
              maxLength={200}
              placeholder="Thanksgiving break"
              className="form-input mt-1"
            />
          </div>
        </div>

        {state.error ? (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            {state.error}
          </p>
        ) : null}

        <AddSubmit />
      </form>
    </div>
  );
}
