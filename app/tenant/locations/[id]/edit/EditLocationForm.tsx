"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { updateLocationAction, type LocationFormState } from "../../actions";
import { LocationFields, type LocationDefaults } from "../../LocationFields";
import type { TimezoneGroup } from "@/lib/timezones";

const initialState: LocationFormState = { error: null, fieldErrors: {} };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export function EditLocationForm({
  location,
  timezoneGroups,
}: {
  location: LocationDefaults & { id: string; status: "active" | "inactive" };
  timezoneGroups: TimezoneGroup[];
}) {
  const [state, formAction] = useFormState(updateLocationAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={location.id} />

      <LocationFields
        defaults={location}
        fieldErrors={state.fieldErrors}
        timezoneGroups={timezoneGroups}
      />

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-ink">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={location.status}
          className="form-input mt-1"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          Inactive locations are hidden from staff but historical data is preserved.
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
          href="/tenant/locations"
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-ink transition hover:bg-bg"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
