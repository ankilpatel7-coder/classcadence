"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  createClassroomAction,
  type ClassroomFormState,
} from "../actions";
import { ClassroomFields } from "../ClassroomFields";

const initialState: ClassroomFormState = { error: null, fieldErrors: {} };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Saving…" : "Add classroom"}
    </button>
  );
}

export function CreateClassroomForm({ locationId }: { locationId: string }) {
  const [state, formAction] = useFormState(createClassroomAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="location_id" value={locationId} />
      <ClassroomFields defaults={{}} fieldErrors={state.fieldErrors} />

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
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
