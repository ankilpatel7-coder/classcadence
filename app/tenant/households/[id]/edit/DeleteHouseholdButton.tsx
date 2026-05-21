"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { deleteHouseholdAction } from "../../actions";

function Button({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !window.confirm(
            `Delete the ${name} household? This permanently removes all students ` +
              `in this household and their enrollment + attendance history.`
          )
        )
          e.preventDefault();
      }}
      className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-surface px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/5 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete household"}
    </button>
  );
}

export function DeleteHouseholdButton({
  householdId,
  householdName,
}: {
  householdId: string;
  householdName: string;
}) {
  return (
    <form action={deleteHouseholdAction}>
      <input type="hidden" name="id" value={householdId} />
      <Button name={householdName} />
    </form>
  );
}
