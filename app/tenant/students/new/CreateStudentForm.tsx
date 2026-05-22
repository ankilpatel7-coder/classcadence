"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { createStudentAction, type StudentState } from "../actions";
import { StudentFields, type LocationOption } from "../StudentFields";

const initialState: StudentState = { error: null, fieldErrors: {} };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Saving…" : "Add student"}
    </button>
  );
}

export function CreateStudentForm({ locations }: { locations: LocationOption[] }) {
  const [state, formAction] = useFormState(createStudentAction, initialState);
  return (
    <form action={formAction} className="space-y-4">
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
        <Link href="/tenant/students" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
