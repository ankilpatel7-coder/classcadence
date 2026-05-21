"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateStudentAction,
  deleteStudentAction,
  type StudentState,
} from "../../../../actions";
import {
  StudentFields,
  type LocationOption,
  type StudentDefaults,
} from "../../StudentFields";
import { Trash2 } from "lucide-react";

const initialState: StudentState = { error: null, fieldErrors: {} };

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

function DeleteBtn({ studentName }: { studentName: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !window.confirm(
            `Delete ${studentName}? This permanently removes their enrollments ` +
              `and attendance history.`
          )
        )
          e.preventDefault();
      }}
      className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-surface px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/5 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete student"}
    </button>
  );
}

export function EditStudentForm({
  student,
  locations,
  householdId,
}: {
  student: StudentDefaults & { id: string };
  locations: LocationOption[];
  householdId: string;
}) {
  const [state, formAction] = useFormState(updateStudentAction, initialState);
  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="id" value={student.id} />
        <input type="hidden" name="household_id" value={householdId} />
        <StudentFields
          defaults={student}
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

      <form action={deleteStudentAction} className="border-t border-line pt-4">
        <input type="hidden" name="id" value={student.id} />
        <input type="hidden" name="household_id" value={householdId} />
        <DeleteBtn
          studentName={
            `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() ||
            "this student"
          }
        />
      </form>
    </div>
  );
}
