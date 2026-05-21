"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateHouseholdAction,
  type HouseholdState,
} from "../../actions";
import {
  HouseholdFields,
  type HouseholdDefaults,
} from "../../HouseholdFields";

const initialState: HouseholdState = { error: null, fieldErrors: {} };

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

export function EditHouseholdForm({
  household,
}: {
  household: HouseholdDefaults & { id: string };
}) {
  const [state, formAction] = useFormState(updateHouseholdAction, initialState);
  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={household.id} />
      <HouseholdFields defaults={household} fieldErrors={state.fieldErrors} />

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit />
        <Link
          href="/tenant/households"
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-ink transition hover:bg-bg"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
