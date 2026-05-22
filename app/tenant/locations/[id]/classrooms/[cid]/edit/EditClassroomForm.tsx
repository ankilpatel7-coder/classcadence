"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateClassroomAction,
  type ClassroomFormState,
} from "../../actions";
import {
  ClassroomFields,
  type ClassroomDefaults,
} from "../../ClassroomFields";

const initialState: ClassroomFormState = { error: null, fieldErrors: {} };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition hover:bg-primary-strong disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export function EditClassroomForm({
  classroom,
  locationId,
}: {
  classroom: ClassroomDefaults & {
    id: string;
    status: "active" | "inactive";
  };
  locationId: string;
}) {
  const [state, formAction] = useFormState(updateClassroomAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={classroom.id} />
      <input type="hidden" name="location_id" value={locationId} />

      <ClassroomFields defaults={classroom} fieldErrors={state.fieldErrors} />

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-ink">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={classroom.status}
          className="form-input mt-1"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          Inactive classrooms are hidden from staff but historical data is preserved.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          Saved.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit />
        <Link
          href={`/tenant/locations/${locationId}/edit`}
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-ink transition hover:bg-bg"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
