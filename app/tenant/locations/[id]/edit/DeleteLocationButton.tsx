"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { deleteLocationAction } from "../../actions";

function Button({ locationName }: { locationName: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (
          !window.confirm(
            `Delete "${locationName}"? This permanently removes the location ` +
              `and its operating hours, holiday closures, classrooms, and time ` +
              `slots. Students and sessions previously assigned will lose their ` +
              `link to this location.`
          )
        ) {
          event.preventDefault();
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-surface px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/5 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete location"}
    </button>
  );
}

export function DeleteLocationButton({
  locationId,
  locationName,
}: {
  locationId: string;
  locationName: string;
}) {
  return (
    <form action={deleteLocationAction}>
      <input type="hidden" name="id" value={locationId} />
      <Button locationName={locationName} />
    </form>
  );
}
