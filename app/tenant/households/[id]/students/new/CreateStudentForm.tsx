"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  createStudentAction,
  type StudentState,
} from "../../../actions";
import { StudentFields, type LocationOption } from "../StudentFields";

const initialState: StudentState = { error: null, fieldErrors: {} };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition hover:bg-primary-strong disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add student"}
    </button>
  );
}

export function CreateStudentForm({
  householdId,
  locations,
}: {
  householdId: string;
  locations: LocationOption[];
}) {
  const [state, formAction] = useFormState(createStudentAction, initialState);
  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="household_id" value={householdId} />
      <StudentFields
        defaults={{}}
        fieldErrors={state.fieldErrors}
        locations={locations}
      />

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit />
        <Link
          href={`/tenant/households/${householdId}/edit`}
          className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-ink transition hover:bg-bg"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
