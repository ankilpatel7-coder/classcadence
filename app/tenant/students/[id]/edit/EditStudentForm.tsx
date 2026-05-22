"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import {
  deleteStudentAction,
  updateStudentAction,
  type StudentState,
} from "../../actions";
import {
  StudentFields,
  type LocationOption,
  type StudentDefaults,
} from "../../StudentFields";

const initialState: StudentState = { error: null, fieldErrors: {} };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

function DeleteBtn({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !window.confirm(
            `Delete ${name}? This permanently removes their enrollments and ` +
              `attendance history.`
          )
        )
          e.preventDefault();
      }}
      className="btn-danger"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete student"}
    </button>
  );
}

export function EditStudentForm({
  student,
  locations,
}: {
  student: StudentDefaults & { id: string };
  locations: LocationOption[];
}) {
  const [state, formAction] = useFormState(updateStudentAction, initialState);
  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="id" value={student.id} />
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
          <Link href="/tenant/students" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>

      <form action={deleteStudentAction} className="border-t border-line pt-4">
        <input type="hidden" name="id" value={student.id} />
        <DeleteBtn
          name={
            `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() ||
            "this student"
          }
        />
      </form>
    </div>
  );
}
