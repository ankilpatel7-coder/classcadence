"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { createLocationAction, type LocationFormState } from "../actions";
import { LocationFields } from "../LocationFields";
import type { TimezoneGroup } from "@/lib/timezones";

const initialState: LocationFormState = { error: null, fieldErrors: {} };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition hover:bg-primary-strong disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add location"}
    </button>
  );
}

export function CreateLocationForm({
  defaultTimezone,
  timezoneGroups,
}: {
  defaultTimezone: string;
  timezoneGroups: TimezoneGroup[];
}) {
  const [state, formAction] = useFormState(createLocationAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <LocationFields
        defaults={{ iana_timezone: defaultTimezone, country: "US" }}
        fieldErrors={state.fieldErrors}
        timezoneGroups={timezoneGroups}
      />

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit />
        <Link
          href="/tenant"
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-ink transition hover:bg-bg"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
