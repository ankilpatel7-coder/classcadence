"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { deleteClassroomAction } from "../../actions";

function Button({ classroomName }: { classroomName: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (
          !window.confirm(
            `Delete "${classroomName}"? This permanently removes the classroom ` +
              `along with its time slots. Any sessions or attendance records ` +
              `tied to those slots will also be deleted.`
          )
        ) {
          event.preventDefault();
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-surface px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/5 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete classroom"}
    </button>
  );
}

export function DeleteClassroomButton({
  classroomId,
  locationId,
  classroomName,
}: {
  classroomId: string;
  locationId: string;
  classroomName: string;
}) {
  return (
    <form action={deleteClassroomAction}>
      <input type="hidden" name="id" value={classroomId} />
      <input type="hidden" name="location_id" value={locationId} />
      <Button classroomName={classroomName} />
    </form>
  );
}
